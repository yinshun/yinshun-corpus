var _sic,_corr,_orig,_reg;
var choice=function(tag,closing){
	if (closing) {
		this.inChoice=0;
		//console.log(this.vars.sic+"->"+this.vars.corr);
	} else {
		this.inChoice=1;
		_sic=_corr=_orig=_reg="";
	}
}
var sic=function(tag,closing){
	if (!closing) {
		this.inChoice=2;
		return true;//return true if want to capture text
	}
}
var orig=sic;
var corr=function(tag,closing,kpos,tpos,start,end){
	if (!closing){
		this.inChoice=3;
	}
}
var reg=corr;

module.exports={choice,sic,corr,orig,reg};