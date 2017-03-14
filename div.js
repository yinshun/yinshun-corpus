const div=function(tag,closing,kpos) {
	if (closing) {
		if (tag.attributes.type==="論") {//for 雜阿含經論會編
			this.putArticleField("rend", "salun",this.makeRange(kpos,this.kPos));
		}
		this._divdepth--;
	} else {
		this._divdepth++;
	}
}
const articlegroup=function(tag,closing,kpos,tpos,start,end){
	if (closing){
		const name=tag.attributes.label;
		this.putGroup(name,kpos);		
	}
}

module.exports={div,articlegroup};