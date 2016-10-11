var prevpage="";
var inlist=false;
var lb=function(tag){
	const n=tag.attributes.n;
	if (!n || n.indexOf(".")==-1){
		//a lb without n in y01 a19.11
		//or lb n has no .  y13.xml page 132~137,not seen by engine.
		return;
	}

	var pbn=n.split(".");

	var page=parseInt(pbn[0],10), line=parseInt(pbn[1],10)-1;
	if (isNaN(page)) page=parseInt(pbn[0].substr(1),10);
	if (page<1) {
		console.log("negative page number, ",tag.name,"n=",tag.attributes.n);
		return;
	}

	var s=this.popBaseText();
	this.putLine(s);

	if (prevpage!==pbn[0] && page===1) {
		this.addBook();
	}

	if (isNaN(page)) {
		throw "error page number "+pbn[0];
	}
	page--;
	if (this.bookCount){
		const kpos=this.makeKPos(this.bookCount-1,page,line,0);
		if (kpos==-1) {
			throw "error lb "+tag.attributes.n;
		}
		this.newLine(kpos, this.tPos);
	}
	prevpage=pbn[0];

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