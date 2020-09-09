var mongoose = require('mongoose');

module.exports = mongoose.model('scrutinScrap', {
  numScrutin : Number,
  nomDeLaLoi : String,
  ventilation : []
});
