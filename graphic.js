const fs=require("fs");
var svgcontent="";
const table=function(tag,isclosing,kpos){
	const url=tag.attributes.facs;
	if (!url) {
		console.log("missing svg",tag)
		return;
	}
	const fn="svg/"+url.substr(0,3)+'/'+url;
	var svg="";
	if (fs.existsSync(fn)) {
		svg=fs.readFileSync(fn,"utf8");
	} else {
		console.log("error loading svg",fn)
	}

	if (isclosing&&svg) {
		this.putArticleField("table", svg , this.makeRange(kpos,this.kPos));
	}
}
const graphic=function(tag){
	const url=tag.attributes.url;
	const fn="svg/"+url.substr(0,3)+'/'+url;
	
	if (fs.existsSync(fn)) {
		svgcontent=fs.readFileSync(fn,"utf8");
	} else {
		svgcontent="";
		console.log("error loading svg",fn)
	}
}
var figurestartkpos=0;
const figure=function(tag,isclosing){
	if (isclosing) {
		if (svgcontent) {
			const kpos=this.kPos;//to cover all character including
			this.putArticleField("figure", svgcontent , this.makeRange(figurestartkpos,kpos));
		}
	} else {
		figurestartkpos=this.kPos;
	}
}
module.exports={graphic,figure,table}