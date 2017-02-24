const CaptureText=true;
const title=function(tag,closing){
	if (tag.attributes.level) return ;//prevent duplicate title
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
	if (!closing) {
		headkpos=this.kPos;
	}
	if ( closing) {
		const t=this.peekText();
		if (divdepth===1) this.putArticle(t);
		const len=this.kcount(t);
		this.putArticleField( "head", divdepth ,this.makeRange(headkpos,headkpos+len));
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
const collection=function(tag){
	this.putField("toc","1\t"+tag.attributes.label);
}
const articlegroup=function(tag){
	this.putField("toc","2\t"+tag.attributes.label);
	this.putGroup(tag.attributes.label);
}

module.exports={div,title,collection,articlegroup,head,divfinalize};