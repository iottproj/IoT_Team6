import React, { useState, useEffect } from 'react';
import './App.css';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchAuthSession } from 'aws-amplify/auth';
import { signInWithRedirect } from 'aws-amplify/auth';
import { signOut } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify'
import { post, get } from 'aws-amplify/api';
import amplifyconfig from './amplifyconfiguration.json';
import awsExports from './aws-exports';

Amplify.configure(awsExports); // Amplify 초기화
Amplify.configure(amplifyconfig);

const locationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png", // 위치 아이콘
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const markers = [
  { id: 1, name: "한국항공대학교", position: [37.6009, 126.8642], umbrellas: 5, }, // umbrellas - 대여 가능 우산 개수
  { id: 2, name: "광화문", position: [37.5759, 126.9769], umbrellas: 3, },
  { id: 3, name: "여의도", position: [37.5240, 126.9269], umbrellas: 4, },
  { id: 4, name: "홍대입구역", position: [37.5561, 126.9236], umbrellas: 2, },
];

function App() {
    const [currentPage, setCurrentPage] = useState("map");
    const [weather, setWeather] = useState(null);
    const [city, setCity] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [location, setLocation] = useState({ lat: null, lon: null });
    const [error, setError] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [postInfoResult, setPostInfoResult] = useState(null);
    const [isRfidPage, setIsRfidPage] = useState(false);
    const [isRentalCompletePage, setIsRentalCompletePage] = useState(false);

    async function handleLogout() {
        try {
            await signOut();
            console.log('Logged out successfully');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }
    
    async function getinfowtempl() {
        try {
            const restOperation = get({
                apiName: 'UserInfoAPI',
                path: `/userinfo/object/${userInfo.sub}`,
            });
            const { body } = await restOperation.response;
            const response = await body.json();

            // 응답이 비어있거나 예상치 못한 형식일 경우를 대비한 예외 처리
            if (!response || typeof response !== 'object' || !response.userId) {
                console.log('No user info');
                await postinfotempl(0);
                await getinfowtempl();
                return;
                //throw new Error('Invalid response format');
            }

            // 각 속성의 타입 검사 및 에러 처리
            if (typeof response?.Bcnt !== 'number') {
                throw new Error('Invalid Bcnt type');
            }
            if (typeof response?.Bcurrent !== 'boolean') {
                throw new Error('Invalid Bcurrent type');
            }

            if (typeof response?.ExtRent !== 'boolean') {
                throw new Error('Invalid ExtRent type');
            }

            if(response?.TTL){
                if (typeof response?.TTL !== 'number') {
                    throw new Error('Invalid TTL type');
                }
                else {
                    setUserInfo(prevUserInfo => ({
                        ...prevUserInfo,
                        Bcnt: response.Bcnt,
                        Bcurrent: response.Bcurrent,
                        TTL: response.TTL,
                        isLoaded: true,                 //로딩 완료여부 플래그
                        isExtRent: response.ExtRent     //기간연장 요청여부 플래그
                    }));
                }
            }
            else {
                setUserInfo(prevUserInfo => ({
                    ...prevUserInfo,
                    Bcnt: response.Bcnt,
                    Bcurrent: response.Bcurrent,
                    TTL: null,
                    isLoaded: true,                 //로딩 완료여부 플래그
                    isExtRent: response.ExtRent     //기간연장 요청여부 플래그
                }));
            }
            
            console.log('GET call succeeded');
            console.log(response);
        } catch (e) {
            console.log('GET call failed: ', e.response ? JSON.parse(e.response.body) : e);
        }
    }

    async function postinfotempl(callnum) {
        try {
            let bodydata;
            const currentTime = Math.floor(Date.now() / 1000);
            switch(callnum) {
                case 0:     //사용자 최초 이용시
                    bodydata = {
                        userId: userInfo.sub,
                        email: userInfo.email,
                        Bcnt: 0,
                        Bcurrent: false,
                        ExtRent: false,         //기간연장 요청여부 플래그
                        //TTL:  0                 //TTL 초기화
                    }
                    break;
                case 1:     //대여요청
                    bodydata = {
                        userId: userInfo.sub,
                        email: userInfo.email,
                        Bcnt: userInfo.Bcnt + 1,                                //대여횟수 1 증가
                        Bcurrent: true,                                         //대여상태 변경
                        ExtRent: userInfo.isExtRent,     
                        TTL: (currentTime + (3 * 24 * 60 * 60))                 // 현재 시간 + 3일, 초(sec) 단위
                    }
                    break;
                case 2:     //반납요청
                    bodydata = {
                        userId: userInfo.sub,
                        email: userInfo.email,
                        Bcnt: userInfo.Bcnt,
                        Bcurrent: false,                //대여상태 변경
                        ExtRent: false,                 //기간연장 요청여부 플래그 초기화
                        //TTL: 0                        // TTL 초기화
                    }
                    break;
                case 3:     //연장요청
                    bodydata = {
                        userId: userInfo.sub,
                        email: userInfo.email,
                        Bcnt: userInfo.Bcnt,
                        Bcurrent: userInfo.Bcurrent,
                        ExtRent: true,                                              //기간연장 요청여부 플래그
                        TTL: ((userInfo.TTL) + (24*60*60))                  // TTL + 1일, 초(sec) 단위
                    }
                    break;
                default:
                    throw new Error('Invalid callnum');
            }
            const restOperation = post({
                apiName: 'UserInfoAPI',
                path: '/userinfo',
                options: {
                body: bodydata
                }
            });

            const { body } = await restOperation.response;
            const response = await body.json();

            // 호출 결과를 state에 저장
            setPostInfoResult({ callnum, response });

            console.log('POST call succeeded');
            console.log(response);
        } catch (e) {
            console.log('POST call failed: ', e.response ? JSON.parse(e.response.body) : e);
        }
    }

      // RFID 리더기 페이지에서 스캔 성공시 대여 완료 페이지로 이동
        const handleRentalComplete = () => {
            setIsRentalCompletePage(true);
            setIsRfidPage(false);
            setCurrentPage("rentalComplete");
          };

         // 대여 완료 페이지에서 대여완료 버튼 클릭 시
        const handleReturnToMain = async () => {
          try {
                // GET 요청
                const response = await axios.get("https://gidqxojiten4ezdkp26uwo4qsi0galib.lambda-url.ap-northeast-2.on.aws/");
                console.log("Response:", response.data);

                // 성공 처리
                if (response.data.message === "Shadow updated successfully") {
                  alert(response.data.message);
                  setIsRentalCompletePage(false);
                  setCurrentPage("details");
                } else {
                  alert("대여 요청에 실패했습니다. 다시 시도해주세요.");
                }
              } catch (error) {
                console.error("대여 요청 중 오류가 발생했습니다:", error);
                alert("대여 요청에 실패했습니다. 다시 시도해주세요.");
              }
        };

    const handleBorrowClick = async () => {
        //현재 우산 대여 여부확인, 이미 대여중이면 진행 불가
        if(userInfo.Bcurrent == true) {
            alert("우산 대여중! 한 번에 한 개의 우산만 대여할 수 있습니다.");
            return;
        }

        // 1차적으로 대여 확인 창 띄우기
        const isConfirmed = window.confirm(`${selectedLocation.name} 위치에서 우산을 대여하시겠습니까?`);
        if (!isConfirmed) return;
        // RFID 리더 페이지로 이동
        try {
              // GET 요청
              const response = await axios.get("https://gidqxojiten4ezdkp26uwo4qsi0galib.lambda-url.ap-northeast-2.on.aws/");
              console.log("Response:", response.data);

              // 성공 처리
              if (response.data.message === "Shadow updated successfully") {
                setIsRfidPage(true);
                setCurrentPage("rfid");
              } else {
                alert("대여 요청에 실패했습니다. 다시 시도해주세요.");
              }
            } catch (error) {
              console.error("대여 요청 중 오류가 발생했습니다:", error);
              alert("대여 요청에 실패했습니다. 다시 시도해주세요.");
            }
    };

    /* 반납하기 버튼 클릭시 */
    const handleReturnClick = () => {
        const isClickedReturn = window.confirm(`${selectedLocation.name} 위치에서 우산을 반납하시겠습니까?`);
        if(!isClickedReturn) return
        if(userInfo.Bcnt == 0 || userInfo.Bcurrent == false) {
            alert("반납할 우산이 없습니다.");
            return
        }
        else{
            postinfotempl(2);
            alert("잠금이 해제되었습니다. 우산을 올바른 위치에 반납해주세요.");
        }
      };

    /* 대여 연장하기 버튼 클릭시 */
    const handleExtendBorrowClick = () => {
        const isClicked = window.confirm(`대여기간을 연장하시겠습니까?`);
        if (!isClicked) return;
        if(userInfo.Bcnt == 0 || userInfo.Bcurrent == false) {
            alert("대여기간을 연장할 우산이 없습니다.");
            return
        }
        else if(userInfo.isExtRent){
            alert("이미 대여기간을 연장한 상태입니다.")
        }
        else{
            // 대여 기간 연장 코드 작성 부분
            postinfotempl(3);
            alert("우산 대여 기간이 1일 연장되었습니다.");
        }
    };

    /* 사용방법 버튼 클릭시 새로운 윈도우 생성 */
    const handleOpenInstructions = () => {
        const instructionsWindow = window.open('', '사용 방법', 'width=600,height=400');
        instructionsWindow.document.write(`
            <html>
                <head>
                    <title>사용 방법</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 20px;
                            background-color: rgb(234, 238, 236);
                        }
                        button {
                            padding: 10px 20px;
                            font-size: 1rem;
                            background-color: rgb(108, 167, 174);
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            margin-top: 20px;
                        }
                        button:hover {
                            background-color: rgb(72, 105, 138);
                        }
                    </style>
                </head>
                <body>
                    <h1>사용 방법</h1>
                    <p>1. 우산 번호를 선택하세요.</p>
                    <p>2. "대여하기" 버튼을 클릭하여 우산을 대여하세요. 우산 대여 기간은 3일입니다.</p>
                    <p>3. RFID 리더기에 NFC 스티커를 찍어주세요.</p>
                    <p>4. 잠금이 모두 해제되고 우산을 가져가시면 "대여완료" 버튼을 눌러주세요.</p>
                    <p>5. 우산을 반납하려면 "반납하기" 버튼을 눌러주세요.</p>
                    <p>6. RFID 리더기에 NFC 스티커를 찍어주세요.</p>
                    <p>6. 올바른 위치에 우산을 넣고 "반납 완료" 버튼을 눌러주세요.</p>
                    <p># 만약 우산 대여 기간을 연장하고 싶다면 우산 번호를 누르고 "대여 연장하기" 버튼을 눌러주세요!</p>
                    <p> → 대여 연장기간은 "1일" 입니다. </p>
                    <button onclick="window.close()">닫기</button>
                </body>
            </html>
        `);
    };

    /* 선택된 위치 저장 후 상세 페이지 이동 */
    const handleLocationSelect = (marker) => {
        setSelectedLocation(marker);
        setCurrentPage("details");
    };

    /* 날씨 정보 실시간 반영 */
    useEffect(() => {
        async function handleLogin() {
            try {
                await signInWithRedirect(); // Hosted UI로 리디렉션
            } catch (error) {
                console.error('Error during login:', error);
            }
        }

        const fetchUser = async () => {
            try {
                const {accessToken, idToken} = (await fetchAuthSession()).tokens ?? {};
                if (idToken) {
                   const email = idToken?.payload?.email.toString(); // 이메일 추출
                   const sub = idToken?.payload?.sub.toString();
                   //console.log('sub :', sub);

                    setUserInfo({
                       email,
                       sub
                    });
                }
                //console.log('access_token:', accessToken)
                //console.log('id_token:', idToken)
                fetchWeather();
            } catch (err) {
                console.log('Error fetching user:', err);
                handleLogin();
            }
        }
        
        const fetchWeather = async () => {
            const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
            const city = 'Seoul';
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                console.log("Weather data:", data);

                if (data.main && data.weather) {
                    setWeather(data);
                } else {
                    console.error("날씨 데이터를 찾을 수 없습니다:", data);
                }
            } catch (error) {
                console.error('날씨 정보를 불러오는 중 오류가 발생했습니다:', error);
            }
        };
        fetchUser();
    }, []);

    const toggleProfile = () => {
            setIsProfileOpen((prevState) => !prevState);
    };

    /* 지도 화면 렌더링 */
    const renderMapPage = () => (
          <div>
            <h1 style={{ color: "#527394", fontSize: "1.8rem", marginBottom: "10px" }}>
              무인 우산 대여 서비스
            </h1>
            <h2 style={{ color: "#6ca7ae", fontSize: "1rem", marginBottom: "10px" }}>
              우산이 필요하신가요? 편하게 우산을 빌려보세요
            </h2>
            <h3 style={{ color: "#6ca7ae", fontSize: "1.2rem", marginBottom: "20px" }}>
              대여하실 우산함 위치를 클릭해주세요
            </h3>
            <MapContainer
              center={[37.5665, 126.9780]} // 서울 중심 좌표
              zoom={12}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  icon={locationIcon}
                >
                  <Popup>
                    <p>대여 가능한 위치: {marker.name}</p>
                    <p>대여 가능 우산 개수: {marker.umbrellas}</p>
                    <button
                       onClick={() => handleLocationSelect(marker)} // 선택된 위치 저장
                       style={{
                       padding: "5px 10px",
                       backgroundColor: "#6ca7ae",
                       color: "white",
                       border: "none",
                       borderRadius: "5px",
                       cursor: "pointer",
                      }}
                    >
                      대여하기
                    </button>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        );

    const renderDetailsPage = () => (
          <div className="App">
            {/* 프로필 버튼 */}
            <button className="profile-button" onClick={toggleProfile}></button>

            <h1 className="title">무인 우산 대여 서비스</h1>
            <p className="description">우산이 필요하신가요? 편하게 우산을 빌려보세요.</p>

            {/* 실시간 날씨 정보 출력 */}
            {weather && weather.main && weather.weather && (
              <div className="weather-info">
                <h2>{selectedLocation
                          ? `선택된 위치: ${selectedLocation.name}`
                          : "위치를 선택하세요."}</h2>
                <div className="weather-details">
                  <p>현재 온도: {weather.main.temp}°C</p>
                  <p>현재 날씨: {weather.weather[0].description}</p>
                  <p>습도: {weather.main.humidity}%</p>
                  <p>압력: {weather.main.pressure} hPa</p>
                  {weather.rain && weather.rain["1h"] && (
                    <p>최근 1시간 강수량: {weather.rain["1h"]} mm</p>
                  )}
                </div>
              </div>
            )}
            <div className="button-grid">
              <button onClick={handleBorrowClick}>대여하기</button>
              <button onClick={handleReturnClick}>반납하기</button>
              <button onClick={handleOpenInstructions}>사용 방법</button>
              <button onClick={handleExtendBorrowClick}>대여 연장하기</button>
            </div>
            <div className={`profile-slide ${isProfileOpen ? "open" : ""}`}>
              <h2>프로필 정보</h2>
              <h2 className="email">이메일 : {userInfo?.email ? userInfo.email : '이메일을 불러오는 중...'}</h2>
              <h2 className="email">총 대여 횟수: {userInfo?.Bcnt !== undefined ? `${userInfo.Bcnt}회` : '대여 횟수 불러오는 중...'}</h2>
              <h2 className="email">남은 대여 기간: 3일</h2>
              <div className="profile-buttons">
                <button onClick={toggleProfile}>닫기</button>
                <button onClick={() => {
                    const confirmLogout = window.confirm("로그아웃 하시겠습니까?");
                    if (confirmLogout) {
                      alert("로그아웃 되었습니다!");
                      handleLogout();
                    }
                  }}
                >
                  로그아웃
                </button>
                <button
                    onClick={() => {
                    setCurrentPage("map");
                    setIsProfileOpen(false); // 프로필 슬라이드 닫기
                    }}
                    style={{
                       marginTop: "10px",
                       padding: "10px",
                       backgroundColor: "#527394",
                       color: "white",
                       border: "none",
                       borderRadius: "5px",
                       cursor: "pointer",
                     }}
                    >
                      다른 우산함 선택
                 </button>
              </div>
            </div>
          </div>
            );
    const renderRfidPage = () => (
      <div className="rfid-page" style={{ textAlign: "center", padding: "40px", backgroundColor: "#eaf4f8", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}>
          <h1 style={{ color: "#fff", fontSize: "2.5rem", marginBottom: "30px", textShadow: "2px 2px 5px rgba(0, 0, 0, 0.5)" }}>
            우산을 RFID 리더기까지 가까이 대주세요.
          </h1>

          {/* 이미지 추가 */}
          <img
            src="/icon1.png"
            alt="RFID 리더기 이미지"
            style={{
              maxWidth: "300px",
              width: "80%",
              marginBottom: "30px",
              borderRadius: "20px",
              boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.2)",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) => e.target.style.transform = "scale(1.1)"} // 마우스를 올리면 확대
            onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
          />

          <button
            onClick={handleRentalComplete}
            style={{
              padding: "15px 30px",
              backgroundColor: "#6ca7ae",
              color: "white",
              fontSize: "1.2rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              marginTop: "20px",
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#527394"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#6ca7ae"}
          >
            대여 완료
          </button>
        </div>
      );
    const renderRentalCompletePage = () => (
      <div className="rental-complete-page" style={{ textAlign: "center", padding: "40px", backgroundColor: "#f0f4f8", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}>
          <h1 style={{ color: "#527394", fontSize: "2.5rem", marginBottom: "20px", textShadow: "2px 2px 5px rgba(0, 0, 0, 0.5)" }}>
            대여가 완료되었습니다!
          </h1>

          <p style={{ fontSize: "1.3rem", color: "#6ca7ae", marginBottom: "40px", fontWeight: "bold" }}>
            우산을 성공적으로 대여하셨습니다. 이용해주셔서 감사합니다!
          </p>

          <button
            onClick={handleReturnToMain}
            style={{
              padding: "15px 30px",
              backgroundColor: "#527394",
              color: "white",
              fontSize: "1.2rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#6ca7ae"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#527394"}
          >
            대여 완료
          </button>
        </div>
      );
    useEffect(() => {

        if (userInfo?.sub && !userInfo?.isLoaded) {
            //console.log('sub:', userInfo.sub);
            //console.log('email:', userInfo.email);
            getinfowtempl();
        }
    }, [userInfo?.sub, userInfo?.isLoaded]);

    useEffect(() => {
        if(userInfo?.sub && postInfoResult) {
            console.log('Rent Event!')
            getinfowtempl();
            console.log(`현재 useState: ${userInfo}`)
        }
    }, [userInfo?.sub, postInfoResult])

    //console.log('Bcnt debug: ', userInfo?.Bcnt);
    //console.log('Bcurrent debug: ', userInfo?.Bcurrent);
    //console.log('TTL debug: ', userInfo?.TTL);
    //console.log('Flag debug: ', userInfo?.isLoaded);
    //console.log('ExtRent debug: ', userInfo?.isExtRent);

    return (
              <div className="App">
                {currentPage === "map" && renderMapPage()}
                {currentPage === "details" && renderDetailsPage()}
                {currentPage === "rfid" && renderRfidPage()}
                {currentPage === "rentalComplete" && renderRentalCompletePage()}
              </div>
          );
        }
export default App;