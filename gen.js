const {createCorpus}=require("ksana-corpus-builder");
const fs=require("fs");
const sourcepath="genxml/";
const {choice,sic,corr,orig,reg}=require("./choice");
const Note=require("./note");
const Ref=require("./ref");
const maxfile=0;
var files=require("./filelist")(maxfile);
//for (var i=0;i<39;i++) files.shift();
var prevpage="";
var refKPos=-1; //kpos of <ref>
var defKPos=-1; //kpos of <def>
var showline=false;
var lb=function(tag){
	const n=tag.attributes.n;
	if (!n || n.indexOf(".")==-1){
		//a lb without n in y01 a19.11
		//or lb n has no .  y13.xml page 132~137,not seen by engine.
		return;
	}

	var pbn=n.split(".");

	var page=parseInt(pbn[0],10), line=parseInt(pbn[1],10)-1;
	if (isNaN(page)) page=parseInt(pbn[0].substr(1),10);
	if (page<1) {
		console.log("negative page number, ",tag.name,"n=",tag.attributes.n);
		return;
	}

	var s=this.popBaseText();
	this.putLine(s);

	if (prevpage!==pbn[0] && page===1) {
		this.addBook();
	}

	if (isNaN(page)) {
		throw "error page number "+pbn[0];
	}
	page--;
	if (this.bookCount){
		const kpos=this.makeKPos(this.bookCount-1,page,line,0);
		if (kpos==-1) {
			throw "error lb "+tag.attributes.n;
		}
		this.newLine(kpos, this.tPos);
	}
	prevpage=pbn[0];
}
var ref=function(tag,closing){ //link to taisho or taixu
	if (tag.isSelfClosing) {
		if (closing){
			var krange=this.makeKRange(this.kPos,this.kPos);
			Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);			
		}
	} else {
		if (closing) {
			var krange=this.makeKRange(refKPos,this.kPos);
			Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
		} else {		
			refKPos=this.kPos;
		}		
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
	if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);//dirty
	this.putLine(s);
	Note.bookEnd.call(this);
}
const p=function(tag){
	this.putEmptyBookField("p");	
}

const body=function(tag,closing){
	closing?this.stop():this.start();
}
const onToken=function(token){
	//console.log(token);
	//return null for stop words
	//return " " for empty token, increase tpos but no inverted is created

	return token
}
const fileStart=function(fn,i){
	const at=fn.lastIndexOf("/");
	console.log(fn)
	fn=fn.substr(at+1);
	fn=fn.substr(0,fn.length-4);//remove .xml
	var kpos=this.kPos;
	if (this.kPos) kpos=this.nextLineStart(this.kPos); //this.kPos point to last char of previos file
	this.putField("file",fn,kpos);
}

const bigrams={};
//require("./bigrams").split(" ").forEach((bi)=>bigrams[bi]=true);

var options={name:"yinshun",inputFormat:"xml",bits:[7,11,5,6],
autostart:false, removePunc:true,bigrams}; //set textOnly not to build inverted
var corpus=createCorpus(options);
corpus.setHandlers(
	{note,lb,choice,corr,sic,orig,reg,body,ptr,ref,p}, //open tag handlers
	{note,choice,corr,sic,orig,reg,ref,body},  //end tag handlers
	{bookStart,bookEnd,onToken,fileStart}  //other handlers
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));

corpus.writeKDB("yinshun.cor",function(byteswritten){
	console.log(byteswritten,"bytes written")
});
//console.log(corpus.romable.buildROM({date:(new Date()).toString()}));
console.log(corpus.totalPosting,corpus.tPos);