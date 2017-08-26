<?php

//--- Read file
$file = new SplFileObject('data.csv');
$lines = [];
while (!$file->eof()) {
	$lines[] = $file->fgets();
}

$file = null;

//--- Parse
$skipLine = true;
$newTopic = true;
$parseTask = false;

// Store
$topics = [];
$CURRENT_TOPIC = null;

///
$DEBUG = null;

foreach ($lines as $line) {

	//--- Skip line
	if($skipLine || empty(trim($line))) {
		$skipLine = false;
		continue;
	}

	//--- Check
	if(substr($line, 0, 5) == ';;;;;') {
		$newTopic = true;
		$skipLine = true;
		continue;
	} else if(count(explode(';', $line)) > 1) {
		$parseTask = true;
	} else {
		continue;
	}

	//--- Handle states
	if($newTopic) {
		$key = explode(';', $line)[1];
		$CURRENT_TOPIC = $key;

		$topics[$key] = [];
		$newTopic = false;
	}

	if($parseTask) {
		$split = explode(';', $line);

		$taskName 	= $split[1];
		$startDate 	= $split[2];

		$taskDates  = [];

		for($i = 4; $i < count($split) - 1; $i += 2) {
			if(empty(trim($split[$i]))) {
				continue;
			}
			$taskDates[] = $split[$i];
		}

		$topics[$CURRENT_TOPIC]['tasks'][] = [
			'name'	=> $taskName,
			'start'	=> $startDate,
			'ends'	=> $taskDates
		];

	}

}

//--- Split into files
$PREFIX = '2017-schedule-';

for($i = 0; $i < 17; $i++) {

	$FILE_NAME = ($PREFIX . $i . '.json');

	//--- Build structure
	$structure = [];
	foreach($topics as $topicName => $topic) {

		$children = [];
		//--- Add children
		//$START_DATE = $topic['start']
		foreach($topic['tasks'] as $task) {
			if($i < count($task['ends'])) {

				$date = $task['ends'][$i];

				if($date == 'CANCEL') {
					continue;
				}

				$children[][] = [
					'title' 	=> $task['name'],
					'start'		=> check_date($task['start']),
					'end'		=> check_date($task['ends'][$i])
				];
			}
		}

		$structure[] = [
			'title'		=> $topicName,
			'children'	=> array_slice($children, 1)
		];

	}

	//--- push
	file_put_contents($FILE_NAME, json_encode($structure));
}

function check_date($date) {
	if(preg_match_all('/(\d+)\.(\d+)\.(\d+)/', $date) === 0) {
		return 'TBD';
	} else {
		return $date;
	}
}
