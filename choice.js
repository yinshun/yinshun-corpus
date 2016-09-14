var choice=function(tag,closing){
	if (closing) {
		//console.log(this.vars.sic+"->"+this.vars.corr);
		showline=true;
	} else {
		this.vars.sic="";
		this.vars.corr="";
		this.vars.orig="";
		this.vars.reg="";
	}
}
var sic=function(tag,closing){
	if (closing) {
		this.vars.sic=this.popText();
	} else {
		return true;//return true if want to capture text
	}
}
var orig=sic;
var corr=function(tag,closing){
	if (closing){
		this.vars.corr=this.popText();
		this.addText(this.vars.corr);
	} else {
		return true
	}
}
var reg=corr;


module.exports={choice,sic,corr,orig,reg};