var inlist=false;

var lb=function(tag){
	this.handlers.lb_page_line.call(this,tag);
}

const p=function(tag){
	this.putEmptyArticleField("p");	
}
const item=function(tag,closing){
	if (!closing && inlist) {
		this.putEmptyArticleField("p");
	}
}
const list=function(tag,closing){
	inlist=!closing;
}
module.exports={lb,list,p,item};