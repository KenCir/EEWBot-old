<?php

class Main
{
    private string $latestId;

    public function __construct()
    {
        $this->latestId = "";
    }

    public function main()
    {
        while (true) {
            try {
                $rawReportXMLData = mb_convert_encoding(file_get_contents('http://www3.nhk.or.jp/sokuho/jishin/data/JishinReport.xml'), "UTF-8", "SJIS");
                $dump = explode("\n", $rawReportXMLData, 2);
                $rawReportXMLData = '<?xml version="1.0" encoding="UTF-8" ?>' . $dump[1];
                $xmlData = new SimpleXMLElement($rawReportXMLData);
                // 最終地震情報URLを取得
                $latestItemURL = $xmlData->record[0]->item[0]["url"];
                $rawLatestEEWData = mb_convert_encoding(file_get_contents($latestItemURL), "UTF-8", "SJIS");
                $dump = explode("\n", $rawLatestEEWData, 2);
                $rawLatestEEWData = '<?xml version="1.0" encoding="UTF-8" ?>' . $dump[1];
                $earthquakeXMLData = new SimpleXMLElement($rawLatestEEWData);
                $earthquake = $earthquakeXMLData->Earthquake;
                if ($earthquake and $earthquake->getChildren()) {
                    $earthquakeArr = (array)$earthquake;
                    $this->update($earthquakeArr["@attributes"]["Id"], $earthquakeArr["@attributes"]["Time"], $earthquakeArr["@attributes"]["Intensity"], $earthquakeArr["@attributes"]["Epicenter"], $earthquakeArr["@attributes"]["Magnitude"], $earthquakeArr["@attributes"]["Depth"], $earthquakeArr["Detail"]);
                }

                sleep(30);
            } catch (Exception $exception) {
                echo $exception->getTraceAsString() . PHP_EOL;
            }
        }
    }

    private function update(string $id, string $time, string $intensity, string $epicenter, string $magnitude, string $depth, string $detail): void
    {
        if ($this->latestId === $id) return;
        $this->latestId = $id;
        file_put_contents("data.json", json_encode(
            array(
                "id" => $id,
                "time" => $time,
                "intensity" => $intensity,
                "epicenter" => $epicenter,
                "magnitude" => $magnitude,
                "depth" => $depth,
                "detail" => $detail
            )
        ), JSON_UNESCAPED_UNICODE);
    }
}

$main = new Main();
$main->main();
