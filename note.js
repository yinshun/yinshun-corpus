//正文內的腳注號<ptr type="note" target="id",
var noteid={};
var ptr=function(id,kpos){ 
	kpos=kpos||this.kPos;
	noteid[id]=kpos;
}
//章或節結束前的注釋群  連到注釋號 <note xml:id="id">
//id 只為了找回 ptr 的 kpos
var def=function(id,text){
	var kpos=noteid[id];
	if (typeof kpos==="undefined"){
		console.error("def without ptr, xmlid:",id);
		return;
	}
	this.putField("intertext",text,kpos);
}
var bookStart=function(){
	noteid={};
}
var bookEnd=function(){

}
module.exports={ptr,def,bookStart,bookEnd};