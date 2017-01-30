const fs=require("fs");
var svgcontent="";
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
			const kpos=this.kPos+1;//to cover all character including
			this.putArticleField("figure", svgcontent , this.makeKRange(figurestartkpos,kpos));
		}
	} else {
		figurestartkpos=this.kPos;
	}
}
module.exports={graphic,figure}