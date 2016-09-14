const {createCorpus}=require("ksana-corpus");
const fs=require("fs");
const sourcepath="xml/";
const {choice,sic,corr,orig,reg}=require("./choice");
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
var note=function(tag,closing){ //
	if (closing) {
		if (!tag.attributes["xml:id"]) { //inline note
			this.vars.note=this.popText();
			console.log(this.vars.note)
		} else {
			
		}
	} else {
		if (!tag.attributes["xml:id"]) {
			return true;	
		}
	}
}

var endOfBook=function(){
	var s=this.popText();
	if (this.vars.linekpos) this.putLine(this.vars.linekpos, s);
}
var body=function(){
	this.start();
}
var corpus=createCorpus("yinshun",{inputformat:"xml",addrbits:0x6b056,autostart:false});
corpus.setHandlers(
	{note,lb,choice,corr,sic,orig,reg,body}
	,{note,choice,corr,sic,orig,reg}
	,{endOfBook}
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));