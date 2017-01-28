var plaid = require('plaid');
var prompt  = require('prompt');
var readline = require('readline');


var plaidClient = new plaid.Client('test_id','test_secret',plaid.environments.tartan);
var instShort = [];
var instLong = [];
var bankID;

//Clear the console
clearConsole();
listAndSelectInstitutions(function(id){
	bankID = id;
	accessBank(id, function(data) {
		listAccounts(data);
		
	});
});

function listAndSelectInstitutions(callback) {
	console.log("Below are the banks you can access:")
	plaid.getInstitutions(plaid.environments.tartan, function(err, response) {
		if(err) console.log(error);
		
		for(var i =0; i< response.length; i++) {
			instLong[i] = response[i].name;
			instShort[i] = response[i].type;
			console.log(i+1 + " - " + instLong[i] );
		}
		getInput("Select an institution: ", callback)
	});	
}

function accessBank(id, callback) {
	id=id-1;
	console.log("Accessing " + instLong[id] +"........");
	getCredentials("Provide credentials for " + instLong[id],function(username, password, pin){
		plaidClient.addAuthUser(instShort[id], {
		  username: username,
		  password: password,
		  pin: pin
		}, {list:true}, function(err, mfaResponse, response) {
		  if (err != null) {
		    // Bad request - invalid credentials, account locked, etc.
		    //Todo - add response behavior
		    console.error(err);
		  } 

		  else if (mfaResponse != null) {
		  	handleMFA(mfaResponse, callback);
		  } 
		  else {
		    callback(response.accounts);
		  }
		});
	});
}

function handleMFA(mfaResponse, callback) {
	if(mfaResponse.type==='questions') {
		getInput(mfaResponse.mfa[0].question, function(data){
			stepAccess(mfaResponse.access_token, data, {}, callback);
		})
	} else if(mfaResponse.mfa.message != null) {
		
		getInput("Please provide the " + mfaResponse.mfa.message, function(data){
			stepAccess(mfaResponse.access_token, data, {}, callback);
		});
	} else {
		console.log("You may receive your multi-factor authentication through the following"); 	
			var optionVals = [];
		 	for(var j=0; j< mfaResponse.mfa.length;j++) {
		  		console.log(j +": " +mfaResponse.mfa[j].type + "   " +mfaResponse.mfa[j].mask);
		  		optionVals[j] = mfaResponse.mfa[j].type;
		  	}

		  	//send step access request with option selected
		  	getInput("Which option would you like to use to send your verification code: ", function(data){
		  		console.log("Resending via " + optionVals[Number(data)]);
		  		stepAccess(mfaResponse.access_token, data, {"send_method":{"type":"phone"}}, callback);
		  	});	
	}
}

function stepAccess(accessToken, response, options, callback) {
	plaidClient.stepAuthUser(accessToken, response, options, function(err, mfaResponse, response){
	if (err != null) {
	    // Bad request - invalid credentials, account locked, etc.
	    console.error(err);
	  } 

	  else if (mfaResponse != null) {
	  		handleMFA(mfaResponse, callback);
	  } 
	  else {
	    callback(response.accounts);
	  }
	});  
}

function listAccounts(accountlist) {
	var output ="x"
	for(var x=0; x<100; x++) {
		output = output += "x";
	}
	console.log(output);
	output="";
	for(x=0;x<25;x++) {
		output += " ";
	}
	output += instLong[Number(bankID)];
	console.log(output + " Account Details");
	console.log("\n");

	for(var i=0; i< accountlist.length;i++) {
		console.log(accountlist[i].meta.name +"-" +accountlist[i].meta.number + "-----"+ 	accountlist[i].balance.available);
	}
	output="";
	for(x=0;x<100;x++) {
		output += "x";
	}
	console.log("\n" + output);

	getInput("\nPress 1 to exit, 2 to check another account", function(data2){
		if(data2==="2") {
			clearConsole();
			listAndSelectInstitutions(function(data){
				accessBank(data, function(data) {
					listAccounts(data);
					
				});
			});
		}
		else return;	
	});
}

function getInput(string1, callback) {
	console.log(string1);
	var rl = readline.createInterface(process.stdin, process.stdout);
	rl.on('line', function(line) {
		rl.close();
		clearConsole();
		callback(line);
	});
}

function getCredentials(bankEntry, callback) {
	console.log(bankEntry);
	prompt.start();
	prompt.get(['username','password','pin'],function(err, result){
		if(err) console.error(err);
		callback(result.username, result.password, result.pin)
	})
}

function clearConsole() {
	return process.stdout.write('\033c');
}
