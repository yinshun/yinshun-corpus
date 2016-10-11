var depth=0;
const CaptureText=true;
const title=function(tag,closing){
	if (this.started)return;//only process title before body
	if (closing) {
		const t=this.popText();
		if (t) this.putField("head","1."+t);
	} else return CaptureText;
}
const head=function(tag,closing) {
	if (closing){
		var h=this.popText();
		this.putField("head",(depth+1)+"."+h);
	} else {
		return true;
	}
}
const div=function(tag,closing) {
	if (closing) {
		depth--;
	} else {
		depth++;
	}
}

module.exports={title,div,head}