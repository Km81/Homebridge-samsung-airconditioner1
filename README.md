□ 작업 배경 : 
 1) 작년 여름에 잘 사용하던 샤오미 IR Remote가 계속 떨어짐 
    - 공유기 특성 문제(TR-AC68U)로 의심되나, DNS(1.1.1.1) 변경, 와이파이 채널 변경 등 6개월간 별 짓 다 해봐도 몇일 후 떨어짐
 2) 스마트싱스 접속이 너무 오래 걸림 
    - 접속 시간 뿐만 아니라, 최근에는 연결 오류가 빈번함
 3) 프로그램 언어에 일자 무식이라, 구글링과 Github의 자료를 토대로 시도 해봄
    - 카폐 회원이신 숙련 개발자 분들이 허접 코딩을 수정해주시기를 바래봄

□ 설치 방법
  * 저의 작업 환경 : 시놀로지 나스 도커, marcoraddatz/homebridge 이미지 사용
                    삼성 멀티 에어컨(16년형, AF16K7970WFN 모델 사용)

 1) Homebridge 설치
   - 스탠드 에어컨과 벽걸이 에어컨 두 장비를 위해 두 개의 Homebridge 설치가 필요함
    (install.sh 추가)

    npm install -g https://github.com/Km81/homebridge-samsung-airconditioner
    npm install -g https://github.com/Km81/homebridge-samsung-airconditioner1

 2) jq 설치 및 장비 토큰 추출
   ① Putty로 도커 이미지에 접속
     sudo docker exec -it homebridge-samsung-airconditioner /bin/sh
     (homebridge-samsung-airconditioner 도커 이미지 이름)

   ② jq 설치
     apt-get install --no-cache jq

   ③ 토큰 추출 (도커 이미지 접속 상태에서 진행)

     cd /usr/local/lib/node_modules/homebridge-samsung-airconditioner
    
     상기 폴더로 이동 후,

     폴더 내 파일인 Server8889.py 파일의 내용 중 certfile의 경로를 수정 
     (marcoraddatz/homebridge 이미지를 사용할 경우, 수정 불필요)
    
     certfile='/usr/local/lib/node_modules/homebridge-samsung-airconditioner/ac14k_m.pem' 
    
     수정 완료 후, 하기 파이썬 실행

     python Server8889.py
 
     이 상태에서 Putty 창을 하나 더 실행하고, 같은 도커 이미지에 다시 접속 후, 경로 이동

     sudo docker exec -it homebridge-samsung-airconditioner /bin/sh
     cd /usr/local/lib/node_modules/homebridge-samsung-airconditioner

     그리고, 하기 커맨드 실행 

     curl -k -H "Content-Type: application/json" -H "DeviceToken: xxxxxxxxxxx" --cert /usr/local/lib/node_modules/homebridge-samsung-airconditioner/ac14k_m.pem --insecure -X POST https://192.168.1.xxx:8888/devicetoken/request
     (https://192.168.1.xxx 는 본인 에어컨 장비 ip로 수정)

     여기서, 에어컨 장비 전원을 키면 처음 Putty 창에서 토큰 정보가 나옴

      {"DeviceToken":"XXXXXXXXXX"} 

      토큰 추출 완료

 3) config 수정
   - config.json 파일 내 accessories 추가
     . "accessory" : 변경 불가 (스탠드 - SamsungAirconditioner, 벽걸이 - SamsungAirconditioner1)
     . "name" : 홈킷 장치 이름
     . "ip" : 삼성 에어컨 장비 ip (멀티(스탠드/벽걸이) 동일 ip)
     . "token" : 삼성 에어컨 고유 토큰 (멀티(스탠드/벽걸이) 동일 토큰)    
     . "patchCert" : ac14k_m.pem 파일 경로    

  예시) 
 
     "accessories": [
    	{
          "accessory": "SamsungAirconditioner",
          "name": "거실 에어컨",
          "ip": "192.168.1.XX",
          "token": "XXXXXXXXXX",
          "patchCert": "/usr/local/lib/node_modules/homebridge-samsung-airconditioner/ac14k_m.pem"
        },
        {
          "accessory": "SamsungAirconditioner1",
          "name": "침실 에어컨",
          "ip": "192.168.1.XX",
          "token": "XXXXXXXXXX",
          "patchCert": "/usr/local/lib/node_modules/homebridge-samsung-airconditioner1/ac14k_m.pem"
    	}
      ],   

□ 홈킷 구성 내용
  1) 모드
    - 자동 → 공기청정 설정됨
    - 난방 → 제습청정 설정됨
    - 냉방 → 냉방청정 설정됨

  2) 설정
    - 환풍기 속도               →    0, 1, 2 로 구성 
                                    [ 0 - 꺼짐, 1 - 미풍(스탠드는 미풍이 없어 약풍), 2 - 자동풍 ]
    - 스윙모드                  →    스탠드는 무풍모드 설정 [ Off : 해제 / On : 무풍 ]
                                     벽걸이는 회전모드 설정 [ Off : 고정 / On : 회전 ]
    - 어린이 보호용 잠금장치 →   자동 건조 설정 [ 열림 : Off / 잠김 : On ]
