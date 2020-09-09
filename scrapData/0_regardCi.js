"use strict"
const fs 								= require('fs');
const https 							= require('https');
const request 					= require('request');
const removeDiacritics 	= require('diacritics').remove;
const dbConf						= require('./db.model');
var mongoose 						= require('mongoose');
var Depute 							= require('./deputeReg.model.js');
var db				 					= mongoose.connect(dbConf.url);

// ================================================
// First data Set
var deputeFileName 				= './data/deputes' + Date.now() + '.json';
var deputesUrl 						= 'https://www.nosdeputes.fr/deputes/json';

function createDate (s) {
	if (!s) { return null; }
	var d = s.split('-');
	return (new Date(d[0], d[1], d[2]));
}
function updateDepute(data) {
	for (let i = 0; i < data.deputes.length; i++) {
		let query 						= { "id_an" : data.deputes[i].depute.id_an }
		let thisDepute				= data.deputes[i].depute;
		let sites_web 				= data.deputes[i].depute.sites_web.map(e => e.site);
		let oneDeputeFilePath = './data/deputeEach/' + thisDepute.slug + Date.now() + '.json';

		download(thisDepute.url_nosdeputes_api, oneDeputeFilePath, updateOneDepute, oneDeputeFilePath);
		var newDep = {
			"compare" : removeDiacritics(thisDepute.nom.replace('-', ' ').replace('\u00e9', 'e')),
			"en_cours" : 0,
			"nom" : thisDepute.nom,
      "sexe": thisDepute.sexe,
      "groupe_sigle": thisDepute.groupe_sigle,
      "parti_ratt_financier": thisDepute.parti_ratt_financier,
      "url_an": thisDepute.url_an,
      "id_an": thisDepute.id_an,
      "url_nosdeputes": thisDepute.url_nosdeputes
    };
		if (newDep.parti_ratt_financier ===  "Parti socialiste") {newDep.groupe_sigle = 'PS';}
		Depute.update(query, newDep, {upsert : true}, function(err, post){
			if (err) {console.log('\x1b[34m[1er data]\x1b[31m[Depute    Fail]' ,'\x1b[0m' + i + ' ' + thisDepute.nom);}
			else {console.log('\x1b[34m[1er data]\x1b[32m[Depute Updated]' ,'\x1b[0m' + i + ' ' + thisDepute.nom);}
		});
	}
}
function readAndParseDepute () {
	fs.readFile(deputeFileName, 'utf-8', function (err, data) {
		if (err) { console.log('Error reading file'); return ; }
		data = JSON.parse(data);
		updateDepute(data);
	});
};

// ================================================
// Second data Set
var deputesEnCoursFileName 	= './data/deputesEnCours' + Date.now() + '.json';
var deputesEnCoursUrl 			= 'https://www.nosdeputes.fr/deputes/enmandat/json';

function createHemiCarto (data) {
	Depute.remove({"en_cours" : 0});
	var rez = '';
	return rez;
}

function updateDeputeEnCours(data) {
	for (let i = 0; i < data.deputes.length; i++) {
		let thisDepute = data.deputes[i].depute;
		let query = { "id_an" : data.deputes[i].depute.id_an }
		let autres_mandats = data.deputes[i].depute.autres_mandats.map(e => e.mandat);
		var newDep = {
	        "autres_mandats" : autres_mandats,
	        "en_cours" : 1
	    };
		Depute.update(query, newDep, {upsert : true}, function(err, post){
			if (err) {console.log('\x1b[34m[2nd data]\x1b[31m[Depute    Fail]' ,'\x1b[0m' + i + ' ' + thisDepute.nom);}
			else {console.log('\x1b[34m[2nd data]\x1b[32m[Depute Updated]' ,'\x1b[0m' + i + ' ' + thisDepute.nom);}
		});
	}
	createHemiCarto(data);
}
function readAndParseDeputeEnCours () {
	fs.readFile(deputesEnCoursFileName, 'utf-8', function (err, data) {
		if (err) { console.log('Error reading file'); return ; }
		data = JSON.parse(data);
		updateDeputeEnCours(data);
	});
};

// ================================================
// Third Data Set
function concat(arr) {
	let res = [];
	for (var i = 0; arr[i]; i++) {
		let concat 	= arr[i].responsabilite.organisme;
		concat 			+= ' / ' + arr[i].responsabilite.fonction;
		res[i] 			= concat;
	}
	return res;
}

function updateOneDepute (oneDeputeFilePath) {
	fs.readFile(oneDeputeFilePath, 'utf-8', function (err, data) {
		if (err) { console.log('Error reading file'); return ; }
		data 								= JSON.parse(data);
		var thisDep 				= data.depute;
		let query 					= { "id_an" : thisDep.id_an };
		let responsabilites = concat(thisDep.responsabilites);
		let res_extra				= concat(thisDep.responsabilites_extra_parlementaires);
		let groupes_par			= concat(thisDep.groupes_parlementaires);
		let addToDep 				= {
			"groupe" : thisDep.groupe,
			"responsabilites" : responsabilites,
			"responsabilites_extra_parlementaires" : res_extra,
			"mandat_debut" : createDate(thisDep.mandat_debut),
			"mandat_fin" : createDate(thisDep.mandat_fin),
			"groupes_par" : groupes_par
		};
		Depute.update(query, addToDep, {upsert : true}, function(err, post){
			if (err) {
				console.log(err);
				console.log('\x1b[34m[3nd data]\x1b[31m[Depute    Fail]' ,'\x1b[0m ' + thisDep.nom);
			}
			else {console.log('\x1b[34m[3nd data]\x1b[32m[Depute Updated]' ,'\x1b[0m ' + thisDep.nom);}
		});
	});
};

// ================================================
// Fourth Data Set
var depSynFileName	= './data/deputeFileName' + Date.now() + '.json';
var deputeSyn		= 'https://www.nosdeputes.fr/synthese/data/json';

function readAndParseSyn () {
	fs.readFile(depSynFileName, 'utf-8', function (err, data) {
		if (err) { console.log('Error reading file'); return ; }
		data = JSON.parse(data);
		updateSyn(data);
	});
};

function updateSyn (data) {
	for (let i = 0; i < data.deputes.length; i++) {
		let thisDep 		= data.deputes[i].depute;
		let query 			= { "id_an" : thisDep.id_an };
		let depUpdt			= {
			"semaines_presence": thisDep.semaines_presence,
			"commission_presences": thisDep.commission_presences,
			"commission_interventions": thisDep.commission_interventions,
			"hemicycle_interventions": thisDep.hemicycle_interventions,
			"hemicycle_interventions_courtes": thisDep.hemicycle_interventions_courtes,
			"amendements_signes": thisDep.amendements_signes,
			"amendements_adoptes": thisDep.amendements_adoptes,
			"rapports": thisDep.rapports,
			"propositions_ecrites": thisDep.propositions_ecrites,
			"propositions_signees": thisDep.propositions_signees,
			"questions_ecrites": thisDep.questions_ecrites,
			"questions_orales": thisDep.questions_orales
		};
		Depute.update(query, depUpdt, {upsert : true}, function(err, post){
			if (err) {console.log('\x1b[34m[4nd data]\x1b[31m[Depute    Fail]' ,'\x1b[0m' + i + ' ' + thisDep.nom);}
			else {    console.log('\x1b[34m[4nd data]\x1b[32m[Depute Updated]' ,'\x1b[0m' + i + ' ' + thisDep.nom);}
		});
	};
};

var download = function(url, dest, cb, opt) {
	var file = fs.createWriteStream(dest);

	var request = https.get(url, function(response) {
		response.pipe(file);
		file.on('finish', function() {
			file.close(cb(opt));
		});
	}).on('error', function(err) {
	});
}

function createDirectory() {
	if (!fs.existsSync('./data')){
    fs.mkdirSync('./data');
		fs.mkdirSync('./data/deputeEach');
	}
}

Depute.remove({}, function () {
	createDirectory();
	download(deputesUrl, deputeFileName, readAndParseDepute);
	download(deputesEnCoursUrl, deputesEnCoursFileName, readAndParseDeputeEnCours);
	download(deputeSyn, depSynFileName, readAndParseSyn);
});
