const {openCorpus}=require("ksana-corpus");
const {exactSearch,convolutionSearch,breakIntoPhrases}=require("ksana-corpus-search");
const assert=require("assert");
const starttest=function(cor){
	p=breakIntoPhrases('法會 菩薩 "abc efg"');
	assert.deepEqual(p,["法會","菩薩","abc efg"]);

	p=breakIntoPhrases('法會!菩薩 "abc efg"');
	assert.deepEqual(p,["法會","!","菩薩","abc efg"]);

	p=breakIntoPhrases('法會*20菩薩 "abc efg"');
	assert.deepEqual(p,["法會*20菩薩","abc efg"]);

	p=breakIntoPhrases('法會?菩薩 "abc efg"');
	assert.deepEqual(p,["法會?菩薩","abc efg"]);

	p=breakIntoPhrases('"xyz""abc efg"');
	assert.deepEqual(p,["xyz","abc efg"]);
	p=breakIntoPhrases('"xyz""abc efg"');
	assert.deepEqual(p,["xyz","abc efg"]);


	convolutionSearch(cor,"從世間的名義說，梵語室利末利，此云勝鬘",{},function(res){
		console.log('terms',res.terms )
		console.log('timer',res.timer)
		console.log(res.matches.map((r)=>[cor.stringify(r[0]),'score',r[1]]).join("\n"));
	})
/*
	exactSearch(cor,'法會 菩薩 "abc efg"',function(res){
		console.log(res)
	});
*/	

}
t=new Date()
openCorpus("yinshun",{inverted:true},function(err,cor){
	if (err) {
		console.log("cannot open corpus");
		return;
	}
	starttest(cor);
})