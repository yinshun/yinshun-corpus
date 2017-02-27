var inlist=false;

var lb=function(tag){
	this.handlers.lb_page_line.call(this,tag);
}

const p=function(tag,closing,kpos){
	this.putEmptyArticleField("p");	
	if (tag.attributes.rend) {
		this.putArticleField("span",tag.attributes.rend,this.makeRange(kpos,this.kPos));
	}	
}

const q=function(tag,closing,kpos){
	if (closing) {
		this.putArticleField("span","q",this.makeRange(kpos,this.kPos));	
	}
}
const seg=function(tag,closing,kpos){
	if (closing) {
		if (tag.attributes.type=="author") {
			this.putArticleField("span","authorseg",this.makeRange(kpos,this.kPos));
		}
		if (tag.attributes.rend) {
			this.putArticleField("span",tag.attributes.rend,this.makeRange(kpos,this.kPos));
		}
	}	
}
const item=function(tag,closing){
	if (!closing && inlist) {
		this.putEmptyArticleField("p");
	}
}
const list=function(tag,closing,kpos){
	inlist=!closing;
	if (closing&&tag.attributes.rend) {
			this.putArticleField("span",tag.attributes.rend,this.makeRange(kpos,this.kPos));
	}
}

module.exports={lb,list,p,q,item,seg};