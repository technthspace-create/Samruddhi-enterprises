<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './PHPMailer/src/Exception.php';
require './PHPMailer/src/PHPMailer.php';
require './PHPMailer/src/SMTP.php';

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'samruddhienterprises.contact@gmail.com';
    $mail->Password = 'kszymgmjkeduhxvt';
    $mail->Port = 465;
    $mail->SMTPSecure = 'ssl';
    $mail->isHTML(true);

    $mail2 = new PHPMailer(true);
    $mail2->isSMTP();
    $mail2->Host = 'smtp.gmail.com';
    $mail2->SMTPAuth = true;
    $mail2->Username = 'samruddhienterprises.contact@gmail.com';
    $mail2->Password = 'kszymgmjkeduhxvt';
    $mail2->Port = 465;
    $mail2->SMTPSecure = 'ssl';
    $mail2->isHTML(true);

    $name = $_POST["name"];
    $number = $_POST["text"];
    $email = $_POST["email"];
    $message = $_POST["message"];

    $mail->setFrom('samruddhienterprises.contact@gmail.com', 'samruddhi-contact');
    $mail->addAddress('samruddhi.575@gmail.com');
    $mail->Subject = ("Customer: ".$name);
    $mail->Body = "Dear Samruddhi Enterprises,<br>$message<br>Contact Info:<br>Name : $name<br>Mobile Number : $number<br>Email : $email";
    
    $mail2->setFrom('samruddhienterprises.contact@gmail.com', 'samruddhi-contact');
    $mail2->addAddress($email);
    $mail2->Subject = ("Samruddhi Enterprises - Do Not Reply.");
    $mail2->Body = "Dear $name,<br> Thank you for contacting Samruddhi Enterprises. We'll get back to you shortly. <br>Regards,<br> Team Samruddhi Enterprises. <br><br><br><h6>Do Not Reply to this mail. For more queries, contact us on samruddhi.575@gmail.com.<h6>";
    
    $mail->send();
    $mail2->send();

    header("Location: ./success.html");
} catch (phpmailerException $e) {
    header("Location: ./fail.html");
  } catch (Exception $e) {
    header("Location: ./fail.html");
  }
?>
