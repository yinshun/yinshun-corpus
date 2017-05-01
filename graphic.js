const fs=require("fs");
var svgcontent="";
const table=function(tag,isclosing,kpos){
	const url=tag.attributes.facs;
	if (!url) {
		//console.log("missing svg",tag)
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
		this.putEmptyArticleField("p",kpos); //for correct p reflow
		//if (this.kPos>kpos) this.putEmptyArticleField("p",this.kPos); 
		this.putArticleField("table", svg , this.makeRange(kpos,this.kPos));
	}
}

const graphic=function(tag,isclosing,kpos){
	const url=tag.attributes.url;
	const fn="svg/"+url.substr(0,3)+'/'+url;
	const inline=tag.attributes.inline;
	if (fs.existsSync(fn)) {
		svgcontent=fs.readFileSync(fn,"utf8");
	} else {
		svgcontent="";
		console.log("error loading svg",fn)
	}
	if (inline) {
		this.putArticleField("inlinesvg", svgcontent , kpos);
		svgcontent="";
	}
}

const figure=function(tag,isclosing,kpos){
	if (isclosing) {
		if (svgcontent) {
			this.putEmptyArticleField("p",kpos); //for correct p reflow
			//if (this.kPos>kpos) this.putEmptyArticleField("p",this.kPos); 
			this.putArticleField("figure", svgcontent , this.makeRange(kpos,this.kPos));
		}
	}
}
module.exports={graphic,figure,table}