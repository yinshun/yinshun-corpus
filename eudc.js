var gid="";
var eudc=[];
const char=function(tag,closing){
	const id=tag.attributes["xml:id"];
	gid=id;
}
const g=function(tag,closing){
	const exp=eudc[tag.attributes.ref.substr(1)];
	if (exp) this.addText(exp);
}
const mapping=function(tag,closing,kpos,tpos,start,end){
	if (closing) {
		const exp=this.substring(start,end);
		eudc[gid]=exp;
	}
}
module.exports={char,g,mapping};