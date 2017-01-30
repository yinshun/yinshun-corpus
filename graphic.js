const fs=require("fs");
const graphic=function(tag){
	const url=tag.attributes.url;
	const fn="svg/"+url.substr(0,3)+'/'+url;
	
	if (fs.existsSync(fn)) {
		const content=fs.readFileSync(fn,"utf8");
		this.putBookField("svg",content);
	} else {
		console.log("error loading svg",fn)
	}
}
module.exports={graphic}