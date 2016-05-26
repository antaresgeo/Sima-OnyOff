<?php
header('Content-Type: application/json; charset=UTF-8');
require_once('config.php');
$codigo = $_GET['codigo'];
$sql = "SELECT json_estudiante('$codigo');";
$res = $DB->get_records_sql($sql);
$json = array_values($res);
//var_dump($json[0]->json_estudiante);
echo $json[0]->json_estudiante;
?>
