const {createCorpus}=require("ksana-corpus");
const fs=require("fs");
const sourcepath="xml/";
const {choice,sic,corr,orig,reg}=require("./choice");
const Note=require("./note");
const Ref=require("./ref");
const maxfile=2;
var files=require("./filelist")(maxfile);

var prevpage="";
var refKPos=-1; //kpos of <ref>
var defKPos=-1; //kpos of <def>
var showline=false;
var lb=function(tag){ //*this* point to session with useful status variable
	if (!tag.attributes.n){
		//a lb without n in y01 a19.11
		return;
	}

	var s=this.popBaseText();
	if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);

	var pbn=tag.attributes.n.split(".");
	this.putLine(s);

	var page=parseInt(pbn[0],10), line=parseInt(pbn[1],10)-1;
	if (isNaN(page)) page=parseInt(pbn[0].substr(1),10);

	if (prevpage&&prevpage!==pbn[0] && page===1) {
		this.addBook();
	}

	if (isNaN(page)) {
		throw "error page number "+pbn[0];
	}
	page--;

	const kpos=this.makeKPos(this.bookCount,page,0,line,0);
	this.newLine(kpos, this.tPos);

	prevpage=pbn[0];
}
var ref=function(tag,closing){ //link to taisho or taixu
	if (tag.isSelfClosing) {
		var krange=this.makeKRange(this.kPos,this.kPos);
		Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
		return;
	}

	if (closing) {
		var krange=this.makeKRange(refKPos,this.kPos);
		Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
	} else {		
		refKPos=this.kPos;
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
			
			var krange=this.makeKRange(defKPos,this.kPos);
			Note.def.call(this,xmlid.substr(4),krange);
		} else {//keep the starting kpos of <note>
			defKPos=this.kPos;
		}
	} else { 
		if (closing) { //inline note
				this.putField("note",this.popText());	
		} else {  //capture the text
			return true;
		}
	}
}

const bookStart=function(){
	Note.bookStart.call(this);
}
const bookEnd=function(){
	var s=this.popBaseText();
	if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);
	this.putLine(s);
	Note.bookEnd.call(this);
}
const p=function(tag){
	this.putEmptyField("p");
}

const body=function(tag,closing){
	if (closing) {
		this.stop();
	}
	else this.start();
}
var corpus=createCorpus("yinshun",{inputformat:"xml",addrbits:0x6b056,autostart:false});
corpus.setHandlers(
	{note,lb,choice,corr,sic,orig,reg,body,ptr,ref,p},
	{note,choice,corr,sic,orig,reg,ref,body},
	{bookStart,bookEnd}
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));
corpus.stop();
//console.log(corpus.romable.getRawFields("p"));
console.log(corpus.romable.getTexts());