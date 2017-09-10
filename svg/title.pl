use utf8;
my $count = 0;
for(my $i=1; $i<=44; $i++)
{
    my $vol = sprintf("Y%02d/*.svg", $i);
    my @files = <${vol}>;

    for(my $j=0; $j<=$#files; $j++)
    {
        runfile($files[$j]);
        $count++;
    }
}
print "count : $count";

sub runfile
{
    local $_;
    my $file = shift;

    my $title = $file;
    $title =~ s/^....//;
    $title =~ s/\.svg//;
    my $outfile = "d:/Work/ksana2016/p/yinshun-corpus/newsvg/" . $file;

    open IN, "<:utf8", $file;
    open OUT, ">:utf8", $outfile;
    my $findtitle = 0;
    my $oldtitle = "";
    while(<IN>)
    {
        if($findtitle == 0)
        {
            if(/<title>(.*?)<\/title>/)
            {
                $oldtitle = $1;
                s/<title>(.*?)<\/title>//;
                $findtitle = 1;
            }
            elsif(/<g[ >]/)
            {
                $findtitle = 1;
            }
        }
        print OUT $_;
    }
    close IN;
    close OUT;

    print $outfile . " : $oldtitle\n";


}