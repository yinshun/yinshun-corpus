var inlist=false;


const seg=function(tag,closing,kpos){
	if (closing) {
		if (tag.attributes.type=="author") {
			this.putArticleField("rend","authorseg",this.makeRange(kpos,this.kPos));
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
}

module.exports={list,item,seg};