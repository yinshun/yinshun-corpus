const {createCorpus}=require("ksana-corpus");
const fs=require("fs");
const sourcepath="xml/";
const {choice,sic,corr,orig,reg}=require("./choice");
const Note=require("./note");
const Ref=require("./ref");
const maxfile=2;
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
var ref=function(tag,closing){ //link to taisho or taixu
	if (tag.isSelfClosing) {
		var krange=this.makeKRange(this.kPos(),this.kPos());
		Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
		return;
	}

	if (closing) {
		var krange=this.makeKRange(this.vars.refKPos,this.kPos());
		Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
	} else {		
		this.vars.refKPos=this.kPos();
	}
}
var ptr=function(tag){ //foot note marker in maintext, point to <note xml:id>
	if (tag.attributes.type==="note"){
		var nid=tag.attributes.target;//注釋號
		if (nid){
			Note.ptr.call(this,nid.substr(5));
		}
	}
}

var note=function(tag,closing){ //note cannot be nested.
	var xmlid=tag.attributes["xml:id"];
	if (xmlid) {
		if (closing) { //closing a note in note group
			//console.log(this.vars.defKPos,this.kPos());
			var krange=this.makeKRange(this.vars.defKPos,this.kPos());
			Note.def.call(this,xmlid.substr(4),krange);
		} else {//keep the starting kpos of <note>
			this.vars.defKPos=this.kPos();
		}
	} else { 
		if (closing) { //inline note
				this.putField("note",this.popText());	
		} else {  //capture the text
			return true;
		}
	}
}

const fileStart=function(){
	Note.bookStart.call(this);
}
const fileEnd=function(){
	var s=this.popText();
	if (this.vars.linekpos) this.putLine(this.vars.linekpos, s);
	Note.bookEnd.call(this);
}

const body=function(){
	this.start();
}
var corpus=createCorpus("yinshun",{inputformat:"xml",addrbits:0x6b056,autostart:false});
corpus.setHandlers(
	{note,lb,choice,corr,sic,orig,reg,body,ptr,ref},
	{note,choice,corr,sic,orig,reg,ref},
	{fileStart,fileEnd}
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));
console.log(corpus.romable.getRawFields("link"));