var inlist=false;

var lb=function(tag){
	this.handlers.lb_page_line.call(this,tag);
}

const p=function(tag){
	this.putEmptyArticleField("p");	
}

const q=function(tag,closing,kpos){
	if (closing) {
		this.putEmptyArticleField("q",this.makeRange(kpos,this.kPos));	
	}
}

const item=function(tag,closing){
	if (!closing && inlist) {
		this.putEmptyArticleField("p");
	}
}
const list=function(tag,closing){
	inlist=!closing;
}
module.exports={lb,list,p,q,item};