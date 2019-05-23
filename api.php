<?php
include('no-cache.php');
$servername = "localhost";
$username = "";
$password = "";
$dbname = "";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
if(isset($_GET['name'])) {
    $name = $_GET['name'];
    $sql = "SELECT data FROM routine where name='$name'";
    $result = $conn->query($sql);
    if ($result->num_rows > 0) {
        // output data of each row
        while($row = $result->fetch_assoc()) {
            echo $row["data"];
        }
    } else {
        echo "[]";
    }
}
if(isset($_POST['name'])) {
    $name = $_POST['name'];
    $data = $_POST['rData'];
    echo $data;
    $sql = "UPDATE routine set data='$data' where name='$name'";
    $result = $conn->query($sql);
}
$conn->close();
exit;
?>
