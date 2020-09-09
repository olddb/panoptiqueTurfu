var mongoose = require('mongoose');

module.exports = mongoose.model('LoiScrap', {
  nom : String,
  nomAlt : String,
  numScrutin : Number,
  nombreDeVotant : Number,
  dateDuVote : Date,
  linkAnalyse : String,
  linkDossier : String,
  theme : String,
  lienLegifrance: String
});
