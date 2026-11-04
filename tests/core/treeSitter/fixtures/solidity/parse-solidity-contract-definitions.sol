contract BaseContract {
    uint256 internal value;
}

interface IMyInterface {
    function getValue() external view returns (uint256);
}

abstract contract AbstractContract {
    function abstractFunction() virtual external;
}

contract MyContract is BaseContract, IMyInterface {
    function getValue() external view override returns (uint256) {
        return value;
    }
}
