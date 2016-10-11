const {createCorpus}=require("ksana-corpus-builder");
const fs=require("fs");
const sourcepath="genxml/";
const maxfile=0;
var files=require("./filelist")(maxfile);
//for (var i=0;i<24;i++) files.shift();

const bookStart=function(){
	noteReset.call(this);
}
const bookEnd=function(){
	var s=this.popBaseText();
	if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);//dirty
	this.putLine(s);
}

const body=function(tag,closing){
	closing?this.stop():this.start();
}
const onToken=function(token){
	//console.log(token);
	//return null for stop words
	//return " " for empty token, increase tpos but no inverted is created
	return token;
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

const {char,g,mapping}=require("./eudc");
const {div,head,title}=require("./div");
const {p,lb,list,item}=require("./format");
const {note,ptr,ref,noteReset}=require("./note");
const {choice,sic,corr,orig,reg}=require("./choice");

corpus.setHandlers(
	//open tag handlers
	{body,list,item,div,p,lb,title,head,mapping,char,g,note,
		choice,corr,sic,orig,reg,ptr,ref}, 
	//end tag handlers
	{body,list,div,head,title,mapping,char,note,
		choice,corr,sic,orig,reg,ref},  
	//other handlers
	{bookStart,bookEnd,onToken,fileStart}  
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));

corpus.writeKDB("yinshun.cor",function(byteswritten){
	console.log(byteswritten,"bytes written")
});

console.log(corpus.totalPosting,corpus.tPos);