create table alerts (
  id_alert int primary key auto_increment,
  image_name varchar(80),
  custom_alert varchar(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

delete from alerts where id_alert = 8;

insert into alerts (image_name, custom_alert)
values 
('my_id_image.png', 'Mi alerta personalizada');