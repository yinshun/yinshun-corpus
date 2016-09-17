/* entire corpus statistic */
/* generate bigram and charset*/
/* compare with unicode variants*/
var files=require("./filelist")(42);
var sourcepath="xml/";
const {createCorpus}=require("ksana-corpus");
const fs=require("fs");
var linecount=0;
var charset={},bigram={};
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
const addToken=function(token){
	if (!charset[token]) charset[token]=0;
	charset[token]++;
}
const p=function(){
	var obj={str:this.popBaseText()};
	var token=null,prevtoken=null;
	while (token=this.getRawToken(obj)) {
		token=token.trim();
		var code=token.charCodeAt(0);
		if (code>=0x3400 && code<0xf800) addToken(token);
		if (prevtoken&&code>=0x4e00&&code<=0x9fff) addBigram(prevtoken+token);
		if (code>=0x4e00&&code<=0x9fff) {
			prevtoken=token;
		} else {
			prevtoken=null;
		}
	};
	this.resetLine(linecount++);
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
var charsetA=sort(charset);
var bigramA=sort(bigram);
console.log("total bigram",bigramA.length);
trimBigram(bigramA,0.5);
charsetA=charsetA.map((i)=>i[0]);
console.log("after trim bigram",bigramA.length);
bigramA=bigramA.map((i)=>i[0]);
fs.writeFileSync("charset.js",'module.exports="'+charsetA.join(",")+'";',"utf8");
fs.writeFileSync("bigram.js",'module.exports="'+bigramA.join(",")+'";',"utf8");