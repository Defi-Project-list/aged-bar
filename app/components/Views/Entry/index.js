import React, { useEffect, useCallback } from 'react';
import { withNavigation } from 'react-navigation';
import PropTypes from 'prop-types';
import { Dimensions, StyleSheet, View, Image } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { recreateVaultWithSamePassword } from '../../../core/Vault';
import {
	EXISTING_USER,
	ONBOARDING_WIZARD,
	METRICS_OPT_IN,
	ENCRYPTION_LIB,
	ORIGINAL,
	CURRENT_APP_VERSION,
	LAST_APP_VERSION
} from '../../../constants/storage';
import { getVersion } from 'react-native-device-info';

/**
 * Entry Screen that decides which screen to show
 * depending on the state of the user
 * new, existing , logged in or not
 * while showing the fox
 */
const LOGO_SIZE = 175;
const LOGO_PADDING = 25;
const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.white
	},
	logoWrapper: {
		backgroundColor: colors.white,
		paddingTop: 50,
		marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2 - LOGO_PADDING,
		height: LOGO_SIZE + LOGO_PADDING * 2
	},
	fox: {
		width: 110,
		height: 110,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	}
});

const Entry = props => {
	const animateAndGoTo = useCallback(
		viewToG => {
			props.navigation.navigate(viewToG);
		},
		[props.navigation]
	);

	const unlockKeychain = useCallback(async () => {
		try {
			// Retreive the credentials
			const { KeyringController } = Engine.context;
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials

				await KeyringController.submitPassword(credentials.password);
				const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
				if (encryptionLib !== ORIGINAL) {
					await recreateVaultWithSamePassword(credentials.password, props.selectedAddress);
					await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
				}
				// Get onboarding wizard state
				const onboardingWizard = await AsyncStorage.getItem(ONBOARDING_WIZARD);
				// Check if user passed through metrics opt-in screen
				const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
				if (!metricsOptIn) {
					animateAndGoTo('OptinMetrics');
				} else if (onboardingWizard) {
					animateAndGoTo('HomeNav');
				} else {
					props.setOnboardingWizardStep(1);
					animateAndGoTo('WalletView');
				}
			} else if (props.passwordSet) {
				animateAndGoTo('Login');
			} else {
				await KeyringController.submitPassword('');
				await SecureKeychain.resetGenericPassword();
				props.navigation.navigate('HomeNav');
			}
		} catch (error) {
			Logger.log(`Keychain couldn't be accessed`, error);
			animateAndGoTo('Login');
		}
	}, [animateAndGoTo, props]);

	useEffect(() => {
		async function startApp() {
			const existingUser = await AsyncStorage.getItem(EXISTING_USER);
			try {
				const currentVersion = await getVersion();
				const savedVersion = await AsyncStorage.getItem(CURRENT_APP_VERSION);
				if (currentVersion !== savedVersion) {
					if (savedVersion) await AsyncStorage.setItem(LAST_APP_VERSION, savedVersion);
					await AsyncStorage.setItem(CURRENT_APP_VERSION, currentVersion);
				}

				const lastVersion = await AsyncStorage.getItem(LAST_APP_VERSION);
				if (!lastVersion) {
					if (existingUser) {
						// Setting last version to first version if user exists and lastVersion does not, to simulate update
						await AsyncStorage.setItem(LAST_APP_VERSION, '0.0.1');
					} else {
						// Setting last version to current version so that it's not treated as an update
						await AsyncStorage.setItem(LAST_APP_VERSION, currentVersion);
					}
				}
			} catch (error) {
				Logger.error(error);
			}

			if (existingUser !== null) {
				unlockKeychain();
			} else {
				unlockKeychain();
			}
		}

		startApp();

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<View style={styles.main}>
			<View style={styles.logoWrapper}>
				<Image style={styles.fox} source={require('../../../images/astrodog.png')} />
			</View>
		</View>
	);
};

Entry.propTypes = {
	/**
	/* navigation object required to push new views
	*/
	navigation: PropTypes.object,
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * Boolean that determines if the user has set a password before
	 */
	passwordSet: PropTypes.bool,
	/**
	 * Dispatch set onboarding wizard step
	 */
	setOnboardingWizardStep: PropTypes.func
};

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

const mapStateToProps = state => ({
	passwordSet: state.user.passwordSet,
	selectedAddress:
		state.engine.backgroundState.PreferencesController &&
		state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigation(Entry));
