import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getRenderableEthGasFee, getRenderableFiatGasFee, apiEstimateModifiedToWEI } from '../../../util/custom-gas';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { BN } from 'ethereumjs-util';
import { fromWei, renderWei, hexToBN, isDecimal, isBN, toBN } from '../../../util/number';
import { getTicker, getNormalizedTxState } from '../../../util/transactions';
import { safeToChecksumAddress } from '../../../util/address';
import Radio from '../Radio';
import StyledButton from '../../UI/StyledButton';
import Device from '../../../util/Device';
import AnalyticsV2 from '../../../util/analyticsV2';
import { isMainnetByChainId } from '../../../util/networks';

const FAST = 'fast';
const AVERAGE = 'average';
const SLOW = 'slow';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: Device.isIphoneX() ? 48 : 24
	},
	customGasHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingBottom: 20
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		alignSelf: 'center'
	},
	optionsContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 20
	},
	basicButton: {
		width: 116,
		height: 36,
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	optionSelected: {
		backgroundColor: colors.grey000,
		borderWidth: 1,
		borderRadius: 20,
		borderColor: colors.grey100
	},
	textOptions: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black
	},
	message: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12
	},
	warningWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		textAlign: 'center',
		width: '100%',
		marginBottom: 10
	},
	warningTextWrapper: {
		width: '100%',
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		flexWrap: 'wrap'
	},
	warningText: {
		color: colors.red,
		fontSize: 12,
		textAlign: 'center',
		...fontStyles.normal
	},
	invisible: {
		opacity: 0
	},
	titleContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	radio: {
		marginLeft: 'auto'
	},
	gasSelectorWrapper: {
		position: 'absolute',
		alignSelf: 'center',
		width: '100%',
		paddingTop: 24
	},
	selectors: {
		position: 'relative',
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		marginBottom: 8
	},
	selector: {
		alignSelf: 'stretch',
		textAlign: 'center',
		alignItems: 'flex-start',
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: colors.grey100,
		marginLeft: -2
	},
	selectorSelected: {
		backgroundColor: colors.blue000,
		borderColor: colors.blue,
		zIndex: 1
	},
	first: {
		borderBottomStartRadius: 6,
		borderTopStartRadius: 6
	},
	last: {
		borderBottomEndRadius: 6,
		borderTopEndRadius: 6
	},
	text: {
		...fontStyles.normal,
		fontSize: 10,
		color: colors.black
	},
	textGasFee: {
		fontSize: 12
	},
	textTitle: {
		...fontStyles.bold,
		fontSize: 10,
		color: colors.black
	},
	advancedOptionsContainer: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	valueRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20
	},
	advancedOptionsText: {
		flex: 1,
		textAlign: 'left',
		...fontStyles.light,
		color: colors.black,
		fontSize: 14
	},
	totalGasWrapper: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		paddingVertical: 8,
		paddingRight: 20
	},
	textTotalGas: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14
	},
	gasInput: {
		flex: 1,
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		color: colors.black,
		borderRadius: 8,
		borderWidth: 1,
		fontSize: 14,
		paddingHorizontal: 10,
		paddingVertical: 8,
		position: 'relative'
	},
	gasInputError: {
		flex: 1,
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		color: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		fontSize: 14,
		paddingHorizontal: 10,
		paddingVertical: 8,
		position: 'relative'
	},
	buttonTransform: {
		transform: [
			{
				translateY: 70
			}
		]
	},
	hidden: {
		opacity: 0,
		height: 0
	}
});

/**
 * PureComponent that renders a selector to choose either fast, average or slow gas fee
 */
class CustomGas extends PureComponent {
	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		/* conversion rate of ETH - FIAT
		*/
		conversionRate: PropTypes.any,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string,
		/**
		 * Callback triggered when gas fee is selected
		 */
		handleGasFeeSelection: PropTypes.func,
		/**
		 * Object BN containing estimated gas limit
		 */
		gas: PropTypes.object,
		/**
		 * Gas limit estimation that should be the minimum value to set
		 */
		minimumGasLimit: PropTypes.string,
		/**
		 * Object BN containing gas price
		 */
		gasPrice: PropTypes.object,
		/**
		 * Object BN containing mininum gas price
		 */
		minimumGasPrice: PropTypes.object,
		/**
		 * Callback to modify parent state
		 */
		onPress: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Displayed when there is a gas station error
		 */
		gasError: PropTypes.string,
		/**
		 * Changes the mode to 'review'
		 */
		review: PropTypes.func,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Object containing basic gas estimates
		 */
		basicGasEstimates: PropTypes.object,
		/**
		 * Saves height of root view to TransactionEditor state
		 */
		saveCustomGasHeight: PropTypes.func,
		/**
		 * Toggles TransactionEditor advancedCustomGas
		 */
		toggleAdvancedCustomGas: PropTypes.func,
		/**
		 * Advanced custom gas is shown or hidden
		 */
		advancedCustomGas: PropTypes.bool,
		/**
		 * Drives animated values
		 */
		animate: PropTypes.func,
		/**
		 * Generates a transform style unique to the component
		 */
		generateTransform: PropTypes.func,
		/**
		 * Computes end value for modal animation when switching to advanced custom gas
		 */
		getAnimatedModalValueForAdvancedCG: PropTypes.func,
		/**
		 * gas selectors are hidden or not
		 */
		hideGasSelectors: PropTypes.bool,
		hideSlow: PropTypes.bool,
		hideAverage: PropTypes.bool,
		hideFast: PropTypes.bool,
		/**
		 * review or edit
		 */
		mode: PropTypes.string,
		/**
		 * review or edit
		 */
		toAdvancedFrom: PropTypes.string,
		/**
		 * (For analytics purposes) View (Approve, Transfer, Confirm) where this component is being used
		 */
		view: PropTypes.string.isRequired,
		/**
		 * A string representing the network chainId
		 */
		chainId: PropTypes.string,
		/**
		 * A string representing the network type
		 */
		networkType: PropTypes.string,
		/**
		 * Extra analytics params to be send with the gas analytics
		 */
		analyticsParams: PropTypes.object,
		/**
		 * The currently selected gas speed
		 */
		gasSpeedSelected: PropTypes.string
	};

	state = {
		gasSpeedSelected: this.props.gasSpeedSelected || AVERAGE,
		customGasPrice: '10',
		customGasLimit: fromWei(this.props.gas, 'wei'),
		customGasPriceBNWei: this.props.gasPrice,
		customGasPriceBN: fromWei(this.props.gasPrice, 'gwei'),
		customGasLimitBN: this.props.gas,
		warningGasLimit: '',
		warningGasPrice: '',
		warningGasPriceHigh: '',
		warningSufficientFunds: '',
		headerHeight: null,
		gasInputHeight: null
	};

	componentDidMount = async () => {
		const { gas, gasPrice, toggleAdvancedCustomGas } = this.props;
		const warningSufficientFunds = this.hasSufficientFunds(gas, gasPrice);
		const { ticker } = this.props;
		if (this.onlyAdvanced()) {
			toggleAdvancedCustomGas(true);
		}

		//Applies ISF error if present before any gas modifications
		this.setState({ warningSufficientFunds, advancedCustomGas: ticker && ticker !== 'ETH' });
	};

	componentDidUpdate = prevProps => {
		if (this.props.advancedCustomGas) {
			this.handleGasRecalculationForCustomGasInput(prevProps);
		}
	};

	handleGasRecalculationForCustomGasInput = prevProps => {
		const actualGasLimitWei = renderWei(hexToBN(this.props.gas));
		if (renderWei(hexToBN(prevProps.gas)) !== actualGasLimitWei)
			this.setState({ customGasLimit: actualGasLimitWei });
	};

	//Validate locally instead of in TransactionEditor, otherwise cannot change back to review mode if insufficient funds
	hasSufficientFunds = (gas, gasPrice) => {
		const {
			transaction: { from, value }
		} = this.props;
		const checksummedFrom = safeToChecksumAddress(from);
		const fromAccount = this.props.accounts[checksummedFrom];
		if (hexToBN(fromAccount.balance).lt(gas.mul(gasPrice).add(toBN(value))))
			return strings('transaction.insufficient');
		return '';
	};

	onPressGas = speed => {
		const {
			onPress,
			basicGasEstimates: { averageGwei, fastGwei, safeLowGwei }
		} = this.props;
		onPress && onPress(speed);
		const speedMap = {
			[FAST]: fastGwei,
			[AVERAGE]: averageGwei,
			[SLOW]: safeLowGwei
		};
		const gwei = speedMap[speed];
		const gasPriceBN = apiEstimateModifiedToWEI(gwei);
		this.setState({
			gasSpeedSelected: speed,
			customGasPrice: gwei,
			customGasPriceBNWei: gasPriceBN,
			warningGasPriceHigh: ''
		});
	};

	toggleEditionOption = () => {
		const {
			gas,
			advancedCustomGas,
			toggleAdvancedCustomGas,
			animate,
			getAnimatedModalValueForAdvancedCG
		} = this.props;
		toggleAdvancedCustomGas();
		if (!advancedCustomGas) {
			animate({
				modalEndValue: getAnimatedModalValueForAdvancedCG(),
				xTranslationName: 'editToAdvanced',
				xTranslationEndValue: 1
			});
			this.setState({ customGasLimit: fromWei(gas, 'wei') });
		} else {
			animate({
				modalEndValue: 0,
				xTranslationName: 'editToAdvanced',
				xTranslationEndValue: 0
			});
		}
	};

	onGasLimitChange = value => {
		const { customGasPriceBNWei } = this.state;
		const bnValue = new BN(value);
		const warningSufficientFunds = this.hasSufficientFunds(bnValue, customGasPriceBNWei);
		let warningGasLimit;
		if (!value || value === '' || !isDecimal(value)) warningGasLimit = strings('transaction.invalid_gas');
		else if (bnValue && !isBN(bnValue)) warningGasLimit = strings('transaction.invalid_gas');
		else if (bnValue.lt(new BN(21000)) || bnValue.gt(new BN(7920028)))
			warningGasLimit = strings('custom_gas.warning_gas_limit');
		else if (this.props.minimumGasLimit && bnValue.lt(new BN(this.props.minimumGasLimit)))
			warningGasLimit = strings('custom_gas.warning_gas_limit_estimated', {
				gas: this.props.minimumGasLimit.toString(10)
			});
		this.setState({
			customGasLimit: value,
			customGasLimitBN: bnValue,
			warningGasLimit,
			warningSufficientFunds
		});
	};

	onGasPriceChange = value => {
		const { customGasLimitBN } = this.state;
		//Added because apiEstimateModifiedToWEI doesn't like empty strings
		const gasPrice = value === '' ? '0' : value.replace(/\s|[a-zA-Z]/, '').replace(',', '.');
		if (!/^\d+$|^\d+\.\d+$/g.test(gasPrice)) {
			return;
		}
		const gasPriceBN = new BN(gasPrice);
		const gasPriceBNWei = apiEstimateModifiedToWEI(gasPrice);
		const warningSufficientFunds = this.hasSufficientFunds(customGasLimitBN, gasPriceBNWei);
		let warningGasPrice;
		let warningGasPriceHigh = '';
		if (this.onlyAdvanced() && this.props.minimumGasPrice) {
			if (parseInt(gasPrice) < parseInt(fromWei(this.props.minimumGasPrice, 'gwei'))) {
				warningGasPrice = strings('transaction.low_gas_price');
			}
		}
		if (this.props.basicGasEstimates) {
			if (parseInt(gasPrice) < parseInt(this.props.basicGasEstimates.safeLowGwei))
				warningGasPrice = strings('transaction.low_gas_price');
			//Warning should be displayed when the gas fee is 1.5 times higher than the fast rate
			if (parseInt(gasPrice) > parseInt(this.props.basicGasEstimates.fastGwei) * 1.5) {
				const currentGasPrice = getRenderableFiatGasFee(
					gasPrice,
					this.props.conversionRate,
					this.props.currentCurrency,
					customGasLimitBN
				);
				warningGasPriceHigh = strings('transaction.high_gas_price', { currentGasPrice });
			}
		}
		if (!value || value === '' || !isDecimal(value) || value <= 0)
			warningGasPrice = strings('transaction.invalid_gas_price');
		if (gasPriceBNWei && !isBN(gasPriceBNWei)) warningGasPrice = strings('transaction.invalid_gas_price');
		this.setState({
			customGasPrice: gasPrice,
			customGasPriceBNWei: gasPriceBNWei,
			customGasPriceBN: gasPriceBN,
			warningGasPrice,
			warningGasPriceHigh,
			warningSufficientFunds
		});
	};

	getAnalyticsParams = () => {
		try {
			const { advancedCustomGas, chainId, networkType, view, analyticsParams } = this.props;
			const { gasSpeedSelected } = this.state;
			return {
				...(analyticsParams || {}),
				network_name: networkType,
				chain_id: chainId,
				function_type: view,
				gas_mode: advancedCustomGas ? 'Advanced' : 'Basic',
				speed_set: advancedCustomGas ? undefined : gasSpeedSelected
			};
		} catch (error) {
			return {};
		}
	};

	//Handle gas fee selection when save button is pressed instead of everytime a change is made, otherwise cannot switch back to review mode if there is an error
	saveCustomGasSelection = () => {
		const { gasSpeedSelected, customGasLimit, customGasPrice } = this.state;
		const { review, gas, handleGasFeeSelection, advancedCustomGas } = this.props;
		if (advancedCustomGas) {
			handleGasFeeSelection(
				new BN(customGasLimit),
				apiEstimateModifiedToWEI(customGasPrice),
				this.state.warningGasPriceHigh,
				{
					mode: 'advanced'
				}
			);
		} else {
			const mode = { mode: gasSpeedSelected };
			const {
				basicGasEstimates: { fastGwei, averageGwei, safeLowGwei }
			} = this.props;
			const noGasWarning = '';
			if (gasSpeedSelected === SLOW)
				handleGasFeeSelection(gas, apiEstimateModifiedToWEI(safeLowGwei), noGasWarning, mode);
			if (gasSpeedSelected === AVERAGE)
				handleGasFeeSelection(gas, apiEstimateModifiedToWEI(averageGwei), noGasWarning, mode);
			if (gasSpeedSelected === FAST)
				handleGasFeeSelection(gas, apiEstimateModifiedToWEI(fastGwei), noGasWarning, mode);
		}

		review();
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.GAS_FEE_CHANGED, this.getAnalyticsParams());
	};

	renderCustomGasSelector = () => {
		const { gasSpeedSelected, headerHeight } = this.state;
		const {
			conversionRate,
			currentCurrency,
			gas,
			generateTransform,
			hideGasSelectors,
			hideSlow,
			hideAverage,
			hideFast,
			basicGasEstimates: { averageGwei, fastGwei, safeLowGwei }
		} = this.props;
		const ticker = getTicker(this.props.ticker);
		const topOffset = { top: headerHeight };
		const gasFastSelected = gasSpeedSelected === FAST;
		const gasAverageSelected = gasSpeedSelected === AVERAGE;
		const gasSlowSelected = gasSpeedSelected === SLOW;
		return (
			<Animated.View
				style={[
					styles.gasSelectorWrapper,
					generateTransform('editToAdvanced', [0, -Device.getDeviceWidth()]),
					topOffset,
					hideGasSelectors && styles.hidden
				]}
			>
				<View style={styles.selectors}>
					{[
						!hideSlow && (
							<TouchableOpacity
								key={'safeLow'}
								onPress={() => this.onPressGas(SLOW)}
								style={[styles.selector, gasSlowSelected && styles.selectorSelected]}
							>
								<View style={styles.titleContainer}>
									<Text style={styles.textTitle}>{strings('transaction.gas_fee_slow')}</Text>
									<View style={styles.radio}>
										<Radio selected={gasSlowSelected} />
									</View>
								</View>
								<Text style={[styles.text, styles.textGasFee]}>
									{getRenderableEthGasFee(safeLowGwei, gas)} {ticker}
								</Text>
								<Text style={styles.text}>
									{getRenderableFiatGasFee(safeLowGwei, conversionRate, currentCurrency, gas)}
								</Text>
							</TouchableOpacity>
						),
						!hideAverage && (
							<TouchableOpacity
								key={AVERAGE}
								onPress={() => this.onPressGas(AVERAGE)}
								style={[styles.selector, gasAverageSelected && styles.selectorSelected]}
							>
								<View style={styles.titleContainer}>
									<Text style={styles.textTitle}>{strings('transaction.gas_fee_average')}</Text>
									<View style={styles.radio}>
										<Radio selected={gasAverageSelected} />
									</View>
								</View>
								<Text style={[styles.text, styles.textGasFee]}>
									{getRenderableEthGasFee(averageGwei, gas)} {ticker}
								</Text>
								<Text style={styles.text}>
									{getRenderableFiatGasFee(averageGwei, conversionRate, currentCurrency, gas)}
								</Text>
							</TouchableOpacity>
						),
						!hideFast && (
							<TouchableOpacity
								key={FAST}
								onPress={() => this.onPressGas(FAST)}
								style={[styles.selector, gasFastSelected && styles.selectorSelected]}
							>
								<View style={styles.titleContainer}>
									<Text style={styles.textTitle}>{strings('transaction.gas_fee_fast')}</Text>
									<View style={styles.radio}>
										<Radio selected={gasFastSelected} />
									</View>
								</View>
								<Text style={[styles.text, styles.textGasFee]}>
									{getRenderableEthGasFee(fastGwei, gas)} {ticker}
								</Text>
								<Text style={styles.text}>
									{getRenderableFiatGasFee(fastGwei, conversionRate, currentCurrency, gas)}
								</Text>
							</TouchableOpacity>
						)
					]
						.filter(Boolean)
						.map((Component, index, array) =>
							React.cloneElement(Component, {
								style: [
									...Component.props.style,
									index === 0 && styles.first,
									index === array.length - 1 && styles.last
								]
							})
						)}
				</View>
				<Text style={styles.message}>{strings('custom_gas.cost_explanation')}</Text>
			</Animated.View>
		);
	};

	renderCustomGasInput = () => {
		const { customGasLimitBN, customGasPriceBNWei, customGasPriceBN, warningGasPriceHigh } = this.state;
		const { generateTransform } = this.props;
		const totalGas = customGasLimitBN && customGasLimitBN.mul(customGasPriceBNWei);
		const ticker = getTicker(this.props.ticker);

		return (
			<Animated.View
				style={[
					styles.advancedOptionsContainer,
					this.onlyAdvanced() ? {} : generateTransform('editToAdvanced', [Device.getDeviceWidth(), 0])
				]}
				onLayout={this.saveGasInputHeight}
			>
				<View style={styles.valueRow}>
					<Text style={styles.advancedOptionsText}>{strings('custom_gas.total')}</Text>
					<View style={styles.totalGasWrapper}>
						<Text style={styles.textTotalGas}>
							{fromWei(totalGas)} {ticker}
						</Text>
					</View>
				</View>
				<View style={styles.valueRow}>
					<Text style={styles.advancedOptionsText}>{strings('custom_gas.gas_limit')}</Text>
					<TextInput
						keyboardType="numeric"
						style={styles.gasInput}
						onChangeText={this.onGasLimitChange}
						//useing BN here due to a glitch that causes it to sometimes render as x.00000001
						value={customGasLimitBN ? customGasLimitBN.toString() : ''}
					/>
				</View>
				<View style={styles.valueRow}>
					<Text style={styles.advancedOptionsText}>{strings('custom_gas.gas_price')}</Text>
					<TextInput
						keyboardType="numeric"
						style={warningGasPriceHigh ? styles.gasInputError : styles.gasInput}
						onChangeText={this.onGasPriceChange}
						value={customGasPriceBN ? customGasPriceBN.toString() : ''}
					/>
				</View>
				{this.renderGasError()}
			</Animated.View>
		);
	};

	renderGasError = () => {
		const { warningGasLimit, warningGasPrice, warningGasPriceHigh, warningSufficientFunds } = this.state;
		const { gasError } = this.props;
		const gasErrorMessage =
			warningGasPrice || warningGasLimit || warningSufficientFunds || warningGasPriceHigh || gasError;
		return (
			<View style={styles.warningWrapper}>
				<View style={[styles.warningTextWrapper, !gasErrorMessage ? styles.invisible : null]}>
					<Text style={styles.warningText}>{gasErrorMessage}</Text>
				</View>
			</View>
		);
	};

	saveHeaderHeight = event =>
		!this.state.headerHeight && this.setState({ headerHeight: event.nativeEvent.layout.height });

	saveGasInputHeight = event => {
		!this.state.gasInputHeight && this.setState({ gasInputHeight: event.nativeEvent.layout.height });
	};

	onlyAdvanced = () => {
		const { chainId, basicGasEstimates } = this.props;
		const isNotMainnet = !isMainnetByChainId(chainId);
		// Check if either no basicGasEstimates were provided or less than 3 options were provided (for example, only the average gas price)
		const noBasicGasEstimates = !basicGasEstimates || Object.keys(basicGasEstimates).length < 3;
		return isNotMainnet || noBasicGasEstimates;
	};

	render = () => {
		const { warningGasLimit, warningGasPrice, warningSufficientFunds } = this.state;
		const {
			review,
			gasError,
			saveCustomGasHeight,
			advancedCustomGas,
			generateTransform,
			mode,
			toAdvancedFrom
		} = this.props;
		let buttonStyle;

		if (toAdvancedFrom === 'edit' && mode === 'edit') {
			buttonStyle = generateTransform('saveButton', [0, 70]);
		} else if (advancedCustomGas) {
			buttonStyle = styles.buttonTransform;
		}

		return (
			<View style={styles.root} onLayout={saveCustomGasHeight}>
				<View onLayout={this.saveHeaderHeight}>
					<View style={styles.customGasHeader}>
						<TouchableOpacity onPress={review}>
							<IonicIcon name={'ios-arrow-back'} size={24} color={colors.black} />
						</TouchableOpacity>
						<Text style={styles.customGasModalTitleText}>{strings('transaction.edit_network_fee')}</Text>
						<IonicIcon name={'ios-arrow-back'} size={24} color={colors.white} />
					</View>
					{this.onlyAdvanced() ? null : (
						<View style={styles.optionsContainer}>
							<TouchableOpacity
								style={[styles.basicButton, advancedCustomGas ? null : styles.optionSelected]}
								onPress={this.toggleEditionOption}
							>
								<Text style={styles.textOptions}>{strings('custom_gas.basic_options')}</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.basicButton, advancedCustomGas ? styles.optionSelected : null]}
								onPress={this.toggleEditionOption}
							>
								<Text style={styles.textOptions}>{strings('custom_gas.advanced_options')}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{this.onlyAdvanced() ? null : this.renderCustomGasSelector()}
				{this.renderCustomGasInput()}

				<Animated.View style={Device.isIos() && buttonStyle}>
					<StyledButton
						disabled={
							/*eslint-disable */
							advancedCustomGas
								? (!!warningGasLimit || !!warningGasPrice || !!warningSufficientFunds || !!gasError) &&
								  warningGasPrice !== strings('transaction.low_gas_price')
								: false
							/*eslint-enable */
						}
						type={'confirm'}
						onPress={this.saveCustomGasSelection}
						testID={'custom-gas-save-button'}
					>
						{strings('custom_gas.save')}
					</StyledButton>
				</Animated.View>
			</View>
		);
	};
}

const mapStateToProps = (state, props) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: props.customTransaction || getNormalizedTxState(state),
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId
});

export default connect(mapStateToProps)(CustomGas);
