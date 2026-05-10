import 'react-native-get-random-values';
import './src/amplifyConfig';
import UploadScreen from './src/UploadScreen';
import { withAuthenticator } from '@aws-amplify/ui-react-native';

function App() {
    return <UploadScreen />;
}

export default withAuthenticator(App);
