const scrap       = require('scrap');
const mongoose    = require('mongoose');
const dbConf			= require('../config/db.model');
var LoiScrap      = require('./loiScrap.model.js');
var ScrutinScrap  = require('./scrutinScrap.model.js');
var DeputeScrap   = require('./deputeScrap.model.js');
var DeputeReg     = require('./deputeReg.model.js');
var optionsDB 	  = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
                	   replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } } };
var db				 		= mongoose.connect(dbConf.url, optionsDB);
var tab           = [];
var count         = 0;

function saveLoiAndScrutin (loi, scrutin) {
  if (loi.nom === '') { return; }
  LoiScrap.update({"numScrutin" : loi.numScrutin}, loi, {upsert : true}, function(err, post){
    if (err) { console.log('\x1b[31m[Loi    Fail]' ,'\x1b[0m' + ' ' + loi.nom + err); }
    else { console.log('\x1b[32m[Loi Updated]' ,'\x1b[0m' + ' ' + loi.nom); }
  });
  ScrutinScrap.update({"numScrutin" : scrutin.numScrutin}, scrutin, {upsert : true}, function(err, post){
    if (err) { console.log('\x1b[31m[Scr    Fail]' ,'\x1b[0m' + ' n°' + scrutin.numScrutin + ' -' + scrutin.nomDeLaLoi + err); }
    else { console.log('\x1b[32m[Scr Updated]' ,'\x1b[0m' + ' n°' + scrutin.numScrutin + ' -' + scrutin.nomDeLaLoi); }
  });
}

function createInfosLoi (link_dossier, cb) {
  var infos = {};
  scrap({url: link_dossier, encoding: 'utf-8'}, function (err, $) {
    if (err) {console.log('err scrap link_dossier + ' + err);}
    infos.lienLegifrance = link_dossier;
    infos.nom = $('.titre-bandeau-bleu > h1').text();

    // var nomAlt = $('font[face="ARIAL"][size="3"]').html().trim();
    // infos.nomAlt = nomAlt.replace(/(\r\n|\n|\r)/gm,'');
    // var theme = infos.nomAlt.match(/(.*?):/g);
    // infos.theme = theme ? theme[0].replace(':','').trim() : '';
    // infos.nomAlt = infos.nomAlt.replace(infos.theme,'').replace(':','').trim();

    cb(infos);
  });
}

function containPresident (e) {
  if (e.includes('Claude Bartolone')) { return false; }
  return true;
}
function cleanDep(e) {
  if (e.includes(' SPLIT')) { e = e.split(' SPLIT')[0]; }
  return(e.trim());
}


function createVentilation (link_analyse, cb) {
  var vote = [];
  var url = link_analyse;

  scrap({url: url, encoding: 'utf-8'}, function (err, $) {
    if (err) {console.log('err scrap link_analyse + ' + err); return; }
    var allGroup = [];
    var countDepute = 0;
    $('#analyse .TTgroupe').each(function (index) {
      var ventilation = {};
      ventilation.nom = $(this).find('a:first-child').attr('name');
      ventilation.pour = [];
      $(this).find('.Pour .deputes li').each(function(){
        countDepute++;
        var name = $(this).html().replace('&nbsp;<b>', ' ').replace(/&nbsp;/g, ' ').replace('</b>', ' ').trim();
        ventilation.pour.push(name);
      });
      ventilation.abstention = [];
      $(this).find('.Abstention .deputes li').each(function(){
        countDepute++;
        var name = $(this).html().replace('&nbsp;<b>', ' ').replace(/&nbsp;/g, ' ').replace('</b>', ' ').trim();
        ventilation.abstention.push(name);
      });
      ventilation.nonVotants = [];
      $(this).find('.Non-votants .deputes').each(function(){
        var list = $(this).html().replace(/&nbsp;/g, ' ').replace(/<\/b>/g, ' ').replace(/<b>/g, '').trim();
        list = list.replace(/MM. /g, '').replace(/MM /g, '').replace(/M. /g, '').replace(/Mme /g, '');
        list = list.replace(/Mmes /g, '').replace(/Mme /g, '').replace(/MM /g, '').replace(/ \.|\./g, '').replace(/ \(/g, 'SPLIT');
        list = list.replace(/&nbsp;/g, ' ').split(/ et |,/g).map(e => cleanDep(e.trim()));
        list = list.filter(containPresident);
        list.forEach(function(e){
          countDepute++;
          ventilation.nonVotants.push(e);
        });
      });
      ventilation.contre = [];
      $(this).find('.Contre .deputes li').each(function(){
        countDepute++;
        var name = $(this).html().replace('&nbsp;<b>', ' ').replace(/&nbsp;/g, ' ').replace('</b>', ' ').trim();
        ventilation.contre.push(name);
      });
      allGroup.push(ventilation);
    });
    cb(allGroup, countDepute);
  });
}

function addOneToTab (x) {
  var link_analyse = 'http://www2.assemblee-nationale.fr' + x.find('.desc').find('a:last-child').attr('href');
  var link_dossier = x.find('.desc').find('a:first-child').attr('href');
  createVentilation(link_analyse, function (vote, countDepute) {
    var d = x.find('.denom + td').html().split('/');
    var date = new Date(d[2], d[1], d[0]);
    var numScrutin = x.find('.denom').html().replace('*', '');
    var loi = {
      numScrutin : +numScrutin,
      nombreDeVotant : countDepute,
      dateDuVote : date,
      linkAnalyse : link_analyse,
      linkDossier : link_dossier,
    }
    var scrutin = {
      numScrutin : +numScrutin
    };
    createInfosLoi(link_dossier, function(infos){
      loi.nom             = infos.nom;
      loi.lienLegifrance  = infos.lienLegifrance;
      scrutin.nomDeLaLoi  = infos.nom;
      scrutin.ventilation = vote;
      // loi.theme           = infos.theme;
      // loi.nomAlt          = infos.nomAlt;
      saveLoiAndScrutin(loi, scrutin);
    });
  });
};
scrap({
    url: 'http://www2.assemblee-nationale.fr/scrutins/liste/(legislature)/15/(type)/SSO/(idDossier)/TOUS',
    encoding: 'utf-8'
  }, function(err, $) {
  count += $('#listeScrutins :not(thead) tr').length;
  $('#listeScrutins :not(thead) tr').each(function (index) {
    addOneToTab($(this));
  });
});
scrap({
  url: 'http://www2.assemblee-nationale.fr/scrutins/liste/(offset)/100/(legislature)/15/(type)/SSO/(idDossier)/TOUS',
  encoding: 'utf-8'
  }, function(err, $) {
  count += $('#listeScrutins :not(thead) tr').length;
  $('#listeScrutins :not(thead) tr').each(function (index) {
    addOneToTab($(this));
  });
});
