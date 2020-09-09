var mongoose = require('mongoose');

module.exports = mongoose.model('Depute', {
	"id": Number,
  "nom": String,
  "nom_de_famille": String,
  "prenom": String,
  "sexe": String,
  "date_naissance": String,
  "lieu_naissance": String,
  "num_deptmt": String,
  "nom_circo": String,
  "num_circo": Number,
  "mandat_debut": String,
  "groupe_sigle": String,
  "parti_ratt_financier": String,
  "sites_web": [String],
  "profession": String,
  "place_en_hemicycle": String,
  "url_an": String,
  "id_an": String,
  "slug": String,
  "url_nosdeputes": String,
  "url_nosdeputes_api": String,
  "nb_mandats":Number,
  "twitter": String,
  "regardCi_id" : String,

  "emails":[String],
	"adresses":[String],
	"anciens_mandats":[String],
	"autres_mandats":[String],
	"anciens_autres_mandats": [String],
	"profession": String,
	"url_nosdeputes" : String,
	"en_cours" : Boolean,

	"groupe" : {
		"organisme" : String,
		"fonction" : String
	},
	"responsabilites" : [String],
	"responsabilites_extra_parlementaires" : [String],
	"groupes_par" : [String],

	"semaines_presence" : Number,
	"commission_presences" : String,
	"commission_interventions" : String,
	"hemicycle_interventions": String,
	"hemicycle_interventions_courtes": String,
	"amendements_signes": String,
	"amendements_adoptes": String,
	"rapports": String,
	"propositions_ecrites": Number,
	"propositions_signees": String,
	"questions_ecrites": String,
	"questions_orales": String,

	"mandat_debut" : Date,
	"mandat_fin" : Date,
	"compare": String

});
