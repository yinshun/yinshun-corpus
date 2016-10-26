var inlist=false;

var lb=function(tag){
	const n=tag.attributes.n;
	if (!n || n.indexOf(".")==-1){
		//a lb without n in y01 a19.11
		//or lb n has no .  y13.xml page 132~137,not seen by engine.
		return;
	}
	var pbn=n.split(".");
	this.handlers.lb.call(this,pbn[0],pbn[1],tag);
}

const p=function(tag){
	this.putEmptyBookField("p");	
}
const item=function(tag,closing){
	if (!closing && inlist) {
		this.putEmptyBookField("p");
	}
}
const list=function(tag,closing){
	inlist=!closing;
}
module.exports={lb,list,p,item};