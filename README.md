# Assistente Cantora

ChatBot desenvolvido para integrar o IBM Watson, o messenger do Facebook e o Google Calendar.

O projeto foi feito para rodar no Cloud Foundry (https://www.cloudfoundry.org/), e os arquivos `cf-api.bat`, `cf-login.bat` e `cf-push.bat` é apenas para facilitar a execução dos comandos com o 

O objetivo é o interessando em marcar uma agenda com a cantora, pode fazê-lo via bate-papo no messenger da página dela. A conversa no IBM Watson Dialog foi contruída para identificar a data, hora, nome do evento e endereço. Com essas informações este projeto é capaz de verificar a disponibilidade diretamente na agenda da cantora no Google. E toda a interação é realizada através do messenger do Facebook.

