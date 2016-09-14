const {createCorpus}=require("ksana-corpus");
const fs=require("fs");
const sourcepath="xml/";
var maxfile=2;
var files=["y42.xml"];//"appendix.xml"
(function buildfilelist(){
	for(var i=0;i<maxfile;i++)	{
		var n="0"+i;
		n=n.substr(n.length-2);
		files.push("y"+ n+".xml");
	}
});
var showline=false;
var lb=function(tag){ //*this* point to session with useful status variable
	var s=this.popText();
	
	var pbn=tag.attributes.n.split(".");
	if (this.vars.linekpos) this.putLine(this.vars.linekpos, s);

	var page=parseInt(pbn[0],10), line=parseInt(pbn[1],10);
	if (isNaN(page)){
		if (!this.vars.prefacepage) this.vars.prefacepage=0;
		if (this.vars.prevpage!==pbn[0]) this.vars.prefacepage++;
		page=this.vars.prefacepage;
	} else {
		page+=this.vars.prefacepage;
	}
	
	this.vars.linekpos= this.makeKPos(this.fileCount(),page,0,line,0);
	//console.log(this.fileCount(),page,line,tag.attributes.n,this.vars.linekpos.toString(16));
	this.vars.prevpage=pbn[0];
}

var choice=function(tag,closing){
	if (closing) {
		//console.log(this.vars.sic+"->"+this.vars.corr);
		showline=true;
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

var note=function(tag,closing){ //
	//console.log("note",text)
	if (closing) {
		this.vars.note=this.popText();
	} else {
		return true;
	}
}
var endOfBook=function(){
	var s=this.popText();
	if (this.vars.linekpos) this.putLine(this.vars.linekpos, s);
}

var corpus=createCorpus("yinshun",{inputformat:"xml",addrbits:0x6b056});
corpus.setHandlers(
	{note,lb,choice,corr,sic,orig,reg}
	,{note,choice,corr,sic,orig,reg}
	,{endOfBook}
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));