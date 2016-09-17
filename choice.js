var _sic,_corr,_orig,_reg;
var choice=function(tag,closing){
	if (closing) {
		//console.log(this.vars.sic+"->"+this.vars.corr);
		showline=true;
	} else {
		_sic=_corr=_orig=_reg="";
	}
}
var sic=function(tag,closing){
	if (closing) {
		_sic=this.popText();
	} else {
		return true;//return true if want to capture text
	}
}
var orig=sic;
var corr=function(tag,closing){
	if (closing){
		_corr=this.popText();
		this.addText(_corr);
	} else {
		return true
	}
}
var reg=corr;


module.exports={choice,sic,corr,orig,reg};