/* entire corpus statistic */
/* generate bigram and charset*/
/* compare with unicode variants*/
var files=require("./filelist")(5);
var sourcepath="xml/";
const {createCorpus,tokenize,TokenTypes}=require("ksana-corpus");
const fs=require("fs");
var linecount=0;
var charset={},bigram={},tokens={};
const threshold=10;

const fileStart=function(){
	console.log(this.filename)
}
const bookEnd=function(){

}
const trimBigram=function(bi,percent){
	var freq=0,i;
	for (var i=0;i<bi.length;i++){
		freq+=bi[i][1];
	}
	console.log("total frequency",freq, freq*percent);
	const f=Math.floor(freq*percent);
	freq=0;
	for (i=0;i<bi.length;i++) {
		freq+=bi[i][1];
		if (freq>f)	 break;
	}
	bi.length=i;
}
const sort=function(obj){
	var arr=[];
	for (var i in obj) arr.push([i,obj[i]]);
	return arr.sort((a,b)=>b[1]-a[1]);
}
const addBigram=function(bi){
	if (!bigram[bi]) bigram[bi]=0;
	bigram[bi]++;
}
const addToken=function(token,type){
	if (type==TokenTypes.NUMBER)return;
	if (!tokens[token]) tokens[token]=0;
	tokens[token]++;
}
const addCJK=function(token){
	if (!charset[token]) charset[token]=0;
	charset[token]++;	
}
const p=function(){
	var str=this.popBaseText();
	var tokenized=tokenize(str);
	var i,prevtk;
	for (i=0;i<tokenized.length;i++) {
		var tk=tokenized[i][0];
		var type=tokenized[i][3];
		var iscjk=type==TokenTypes.CJK;
		if (iscjk) {
			addCJK(tk);
			prevtk&& addBigram(prevtk+tk);
			prevtk=tk;
		} else {
			addToken(tk,type);
			prevtk=null;
		}
	}
	this.newLine(linecount++);
	//if (s.length>1000) console.log(s,10);
}
const bits=[1,1,0,9,15]//allow very long line (2^15)
var corpus=createCorpus("yinshun",{inputformat:"xml",bits,autostart:true});
corpus.setHandlers(
	{},
	{p},
	{fileStart,bookEnd}
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));
corpus.stop();
var tokensA=sort(tokens);
var charsetA=sort(charset);
var bigramA=sort(bigram);
console.log("total bigram",bigramA.length);
trimBigram(bigramA,0.5);
console.log("after trim bigram",bigramA.length);

charsetA=charsetA.map((i)=>i[0]);
tokensA=tokensA.map((i)=>i[0]);
bigramA=bigramA.map((i)=>i[0]);

fs.writeFileSync("charset.js",'module.exports="'+charsetA.join(" ")+'";',"utf8");
fs.writeFileSync("tokens.js",'module.exports="'+tokensA.join(" ")+'";',"utf8");
fs.writeFileSync("bigrams.js",'module.exports="'+bigramA.join(" ")+'";',"utf8");