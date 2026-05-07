
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';


const HOME_URL = 'https://reco-act.movingjin.com/login';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(HOME_URL);

  const domain = (() => {
    try {
      return new URL(currentUrl).hostname.replace('www.', '');
    } catch {
      return currentUrl;
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* 로딩 프로그레스 바 */}
      {loading && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {/* 웹뷰 */}
      <WebView
        ref={webViewRef}
        source={{ uri: HOME_URL }}
        style={styles.webView}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
          </View>
        )}
        injectedJavaScriptBeforeContentLoaded={`
          (function() {
            const originalClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function() {
              if (this.download && this.href.startsWith('blob:')) {
                const filename = this.download;
                fetch(this.href)
                  .then(r => r.blob())
                  .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'DOWNLOAD',
                        base64: reader.result.split(',')[1],
                        filename,
                        mimeType: blob.type,
                      }));
                    };
                    reader.readAsDataURL(blob);
                  });
                return;
              }
              originalClick.call(this);
            };
          })();
          true;
        `}
        onMessage={async (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type !== 'DOWNLOAD') return;

            const path = FileSystem.documentDirectory + data.filename;
            await FileSystem.writeAsStringAsync(path, data.base64, {
              encoding: 'base64',  // ← EncodingType.Base64 대신 문자열로
            });
            await Sharing.shareAsync(path, {
              mimeType: data.mimeType,
              dialogTitle: `${data.filename} 저장`,
            });
          } catch (e) {
            console.error('다운로드 실패:', e);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: '#e8eaed',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#4285F4',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});