const mongoose    = require('mongoose');
const removeDiacritics = require('diacritics').remove;
const dbConf			= require('../config/db.model');
var ScrutinScrap  = require('./scrutinScrap.model.js');
var DeputeScrap   = require('./deputeScrap.model.js');
var DeputeReg     = require('./deputeReg.model.js');
var db				 		= mongoose.connect(dbConf.url);
var deputesPos    = [];
var count         = 0;

function addOnePosition(dep, loi, numScrutin, pos, groupName){
  var compare = removeDiacritics(dep.replace('-', ' '));
  var index = deputesPos.map(o => o.compare).indexOf(compare);
  var position = { nom: loi, num: numScrutin, val: pos };
  if (index >= 0) { deputesPos[index].position.push(position); }
  else {
      deputesPos.push({
      groupe: groupName,
      nom: dep,
      position : [position],
      compare: removeDiacritics(dep.replace('-', ' '))
    });
  }
}

function extract(votes, pos) {
  return votes.filter(e => e.val === pos).map(e => e.num);
}

function format (votes) {
  return {
    pour : extract(votes, 0),
    abstention : extract(votes, 1),
    nonVotants : extract(votes, 2),
    contre : extract(votes, 3)
  }
}

function checkForEmptyDep(dep, i) {
  var compare = removeDiacritics(dep.nom.replace('-', ' '));
  var index = deputesPos.map(o => o.compare).indexOf(compare);
  if (index < 0) {
    var dep = {
      idAss: dep.id_an,
      nom : dep.nom.replace('\u00e9', 'e'),
      lienNosDeputees : dep.url_nosdeputes,
      groupe : dep.groupe.organisme,
      tauxDePresence : 0,
      parti: dep.parti_ratt_financier,
      mandat_debut : dep.mandat_debut,
      mandat_fin : dep.mandat_fin,
      positionnements : []
    };
    DeputeScrap.update({"idAss" : dep.idAss}, dep, {upsert : true}, function(err, post){
      if (err) {console.log('\x1b[31m[Dep Vide    Fail]' ,'\x1b[0m' + ' ' + dep.nom + ' ' + err);}
      else {
        count--;
        console.log('\x1b[32m[Dep Vide Updated]' ,'\x1b[0m' + ' ' + dep.nom + ' ' + count);
        if (count <= 0) { mongoose.connection.close(); }
      }
    });
  }
}

function emptyDeps() {
  DeputeReg.find({}, function (err, deps) {
    if (err) { console.log('Err in DeputeReg.find ' + err); return;}
    DeputeScrap.count({}, function(err, numOfDocs){
      count = deps.length - numOfDocs;
      deps.forEach((dep, i) => checkForEmptyDep(dep, i));
    });
  });
}

function completeDepute(x, i) {
  var query = {compare : removeDiacritics(x.nom.replace('-', ' ').replace("  (par délégation)", "")) };
  query.compare = query.compare.includes('Genevieve Gosselin') ? 'Genevieve Gosselin Fleury' : query.compare;
  DeputeReg.findOne(query, function(err, obj){
    if (err) { console.log('err with ' + x.nom + ' ' + err);  return; }
    if (!obj){ console.log('not find in regard ' + x.nom);    return; }
    var idDep   = obj.id_an;
    var lienDep = obj.url_nosdeputes;
    var parti_r = obj.parti_ratt_financier;
    var debut   = obj.mandat_debut;
    var fin     = obj.mandat_fin;
    var presenD = +obj.semaines_presence;

    var dep = {
      idAss: idDep,
      nom : x.nom.replace('\u00e9', 'e').replace("  (par délégation)", ""),
      lienNosDeputees : lienDep,
      groupe : x.groupe,
      tauxDePresence : presenD || 0,
      parti : parti_r,
      mandat_debut : debut,
      mandat_fin : fin,
      positionnements : format(x.position)
    };
    DeputeScrap.update({"idAss" : idDep}, dep, {upsert : true}, function(err, post){
      if (err) {console.log('\x1b[31m[Dep    Fail]' ,'\x1b[0m' + ' ' + dep.nom + ' ' + err);}
      else {    console.log('\x1b[32m[Dep Updated]' ,'\x1b[0m' + ' ' + dep.nom);}
      if (i >= deputesPos.length - 1) { emptyDeps(); }
    });
  });
}

function linkLaw(law, i) {
  var lawName = law.nomDeLaLoi;
  var lawNum = law.numScrutin;
  law.ventilation.forEach(function(x){
    x.pour.forEach(function(dep){       addOnePosition(dep, lawName, lawNum, 0, x.nom); })
    x.abstention.forEach(function(dep){ addOnePosition(dep, lawName, lawNum, 1, x.nom); })
    x.nonVotants.forEach(function(dep){ addOnePosition(dep, lawName, lawNum, 2, x.nom); })
    x.contre.forEach(function(dep){     addOnePosition(dep, lawName, lawNum, 3, x.nom); })
  });
  if ((i + 1) == count) { deputesPos.forEach(function(x, i){ completeDepute(x, i); }); }
}

DeputeScrap.remove({}, function() {
  ScrutinScrap.count({}, function(err, length){
    count = length;
    ScrutinScrap.find({}, function(e, i) { i.forEach(linkLaw); });
  });
});
