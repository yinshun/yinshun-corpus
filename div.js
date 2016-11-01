const CaptureText=true;
const title=function(tag,closing){
	if (this.started)return;//only process title before body
	if (closing) {
		const t=this.popText();
		if (t) this.putField("head","1."+t);
	} else return CaptureText;
}
var div0kpos=1;// kpos of top level div (as article
var headkpos=1;//kpos of begining of head
var divdepth=0;

const head=function(tag,closing) {
	if (divdepth<1)return;
	if (divdepth===1 && closing) {
		this.putField("article",this.peekText(),this.kPos);
	}
	return this.handlers.head_subtree.call(this,tag,closing,divdepth);
}

const div=function(tag,closing) {
	if (closing) {
		divdepth--;
	} else {
		if (divdepth==0) {
			div0kpos=this.kPos;
		}
		divdepth++;
	}
}

const divfinalize=function(){
	this.handlers.head_subtree_finalize.call(this);
}

const div1=function(tag,closing){
	const depth=parseInt(tag.name.substr(3),10);
	if (closing) {
		const text=this.popText();
		this.putField("toc",depth+"\t"+text);
	} else {
		return true;
	}
}
const div2=div1, div3=div1 ,div4=div1;
module.exports={title,div,div1,div2,div3,div4,head,divfinalize};