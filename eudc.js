var gid="";
var eudc=[];
const CaptureText=true;
const char=function(tag,closing){
	const id=tag.attributes["xml:id"];
	gid=id;
}
const g=function(tag,closing){
	const exp=eudc[tag.attributes.ref.substr(1)];
	if (exp) this.addText(exp);
}
const mapping=function(tag,closing){
	if (closing) {
		const exp=this.popText();
		eudc[gid]=exp;
	} else {
		this.popText();
		return CaptureText;
	}
}
module.exports={char,g,mapping};