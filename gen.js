var createCorpus=null
try {
	createCorpus=require("ksana-corpus-builder").createCorpus;
} catch(e){
	createCorpus=require("ksana-corpus-lib").createCorpus;
}

const fs=require("fs");
const sourcepath="xml/";
const maxfile=0;
var files=require("./filelist")(maxfile);
//for (var i=0;i<35;i++) files.shift();
//files.length=17;
const bilink=require("./bilink");

const bookStart=function(){
	noteReset.call(this);
}
const bookEnd=function(){
}

const body=function(tag,closing){
	closing?this.stop():this.start();
}

const fileStart=function(fn,i){
	const at=fn.lastIndexOf("/");
	console.log(fn)
	fn=fn.substr(at+1);
	fn=fn.substr(0,fn.length-4);//remove .xml
	var kpos=this.nextLineStart(this.kPos); //this.kPos point to last char of previos file
}

const bigrams={};

require("./bigrams").split(" ").forEach((bi)=>bigrams[bi]=true);

//build bigram if not exists
const bilinkfield="bilink@taisho";
const linkTo={[bilinkfield]:[]};//list of articles has bilink to taisho, for taisho to build reverse link

var options={name:"yinshun",inputFormat:"xml",
bitPat:"yinshun",title:"印順法師佛學著作集",
topDIVAsArticle:true,
rendClass:["q"],
articleFields:["head","ptr","def","yinshunnote","inlinenote",
"link","noteid","figure","table",bilinkfield,"p","span"],
linkTo:linkTo,
displayOptions:{groupColumn:[12,24,32]},
extrasize:1024*1024*30, //for svg
autostart:false,bigrams}; //set textOnly not to build inverted
var corpus=createCorpus(options);

const {char,g,mapping}=require("./eudc");
const {div,articlegroup}=require("./div");
const {list,item,seg}=require("./format");
const {note,ptr,ref,noteReset,notefinalize}=require("./note");
const {choice,sic,corr,orig,reg}=require("./choice");
const {graphic,figure,table}=require("./graphic");

const finalize=function(){
	notefinalize.call(this);
	linkTo[bilinkfield]=bilink.putbilink(this,bilinkfield);
}
corpus.setHandlers(
	//open tag handlers
	{body,list,item,div,mapping,char,g,note,articlegroup,
		choice,corr,sic,orig,reg,ptr,ref,graphic,figure,table,seg}, 
	//end tag handlers
	{body,list,div,mapping,char,note,articlegroup,
		choice,corr,sic,orig,reg,ref,figure,table,seg}, 
	//other handlers
	{bookStart,bookEnd,fileStart,finalize}  
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));

corpus.writeKDB("yinshun.cor",function(byteswritten){
	console.log(byteswritten,"bytes written")
});

console.log(corpus.totalPosting,corpus.tPos);