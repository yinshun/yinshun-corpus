//正文內的腳注號<ptr type="note" target="id",
var noteid={};
const CaptureText=true;
const Ref=require("./ref");
var refKPos=-1; //kpos of <ref>
var defKPos=-1; //kpos of <def>

var ptr=function(tag){ //foot note marker in maintext, point to <note xml:id>
	if (tag.attributes.type==="note"){
		var nid=tag.attributes.target;//注釋號
		if (nid){
			noteid[nid.substr(5)]=this.kPos;
		}
	}
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

var note=function(tag,closing){ //note cannot be nested.
	if (tag.attributes.type=="editorial")return;
	var xmlid=tag.attributes["xml:id"];
	if (xmlid) {
		if (closing) { //closing a note in note group
			var krange=this.makeKRange(defKPos,this.kPos);
			def.call(this,xmlid.substr(4),krange);
		} else {//keep the starting kpos of <note>
			defKPos=this.kPos;
		}
	} else { 
		if (closing) { //inline note
				this.putField("note",this.popText());	
		} else {  //capture the text
			return CaptureText;
		}
	}
}

var noteReset=function(){
	noteid={};
}


var ref=function(tag,closing){ //link to taisho or taixu
	if (tag.isSelfClosing) {
		if (closing){
			var krange=this.makeKRange(this.kPos,this.kPos);
			Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);			
		}
	} else {
		if (closing) {
			var krange=this.makeKRange(refKPos,this.kPos);
			Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
		} else {		
			refKPos=this.kPos;
		}		
	}
}

module.exports={note,ptr,ref,noteReset};