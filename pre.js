/* entire corpus statistic */
/* generate bigram and charset*/
/* compare with unicode variants*/
var files=require("./filelist")(2);
var sourcepath="xml/";
const {createCorpus}=require("ksana-corpus");
const maxfile=1;
const fs=require("fs");

const fileStart=function(){
	
}
const bookEnd=function(){

}
var linecount=0;
const p=function(){
	var s=this.popText();
	console.log(s.replace(/\n/g,"").substr(0,50));
	this.putLine(s,linecount++);
	//if (s.length>1000) console.log(s,10);
}
const addrbits=0x1109F;//allow very long like (2^15)
var corpus=createCorpus("yinshun",{inputformat:"xml",addrbits,autostart:true});
corpus.setHandlers(
	{},
	{p},
	{fileStart,bookEnd}
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));
corpus.stop();
